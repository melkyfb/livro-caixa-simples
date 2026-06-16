from aws_cdk import (
    Stack,
    aws_cognito as cognito,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_rds as rds,
    aws_ec2 as ec2,
    aws_lambda as _lambda,
    aws_apigatewayv2 as apigwv2,
    aws_apigatewayv2_integrations as integrations,
    RemovalPolicy,
    CfnOutput
)
from constructs import Construct

class InfraStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. Cognito User Pool
        user_pool = cognito.UserPool(self, "LivroCaixaUserPool",
            user_pool_name="livro-caixa-user-pool",
            self_sign_up_enabled=True,
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            sign_in_aliases=cognito.SignInAliases(email=True),
            mfa=cognito.Mfa.OPTIONAL, # User can choose to enable MFA
            mfa_second_factor=cognito.MfaSecondFactor(
                otp=True,
                sms=True
            ),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=True
            ),
            removal_policy=RemovalPolicy.DESTROY # Change for Production if needed
        )

        user_pool_client = user_pool.add_client("LivroCaixaClient",
            auth_flows=cognito.AuthFlow(
                user_password=True,
                user_srp=True
            )
        )

        # Outputs
        CfnOutput(self, "UserPoolId", value=user_pool.user_pool_id)
        CfnOutput(self, "UserPoolClientId", value=user_pool_client.user_pool_client_id)

        # 2. S3 Bucket for Frontend
        frontend_bucket = s3.Bucket(self, "LivroCaixaFrontendBucket",
            website_index_document="index.html",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        # 3. CloudFront Distribution
        distribution = cloudfront.Distribution(self, "LivroCaixaDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(frontend_bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            ),
            default_root_object="index.html",
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html"
                ),
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html"
                )
            ]
        )

        CfnOutput(self, "CloudFrontURL", value=distribution.distribution_domain_name)

        # 4. VPC for Aurora
        vpc = ec2.Vpc(self, "LivroCaixaVpc", max_azs=2)

        # 5. Aurora Serverless v2 (PostgreSQL)
        cluster = rds.DatabaseCluster(self, "LivroCaixaDatabase",
            engine=rds.DatabaseClusterEngine.aurora_postgresql(
                version=rds.AuroraPostgresEngineVersion.VER_15_4
            ),
            vpc=vpc,
            writer=rds.ClusterInstance.serverless_v2("writer"),
            serverless_v2_min_capacity=0.5,
            serverless_v2_max_capacity=2.0,
            removal_policy=RemovalPolicy.DESTROY # Change for Production
        )

        # 6. Lambda Function for FastAPI
        api_lambda = _lambda.Function(self, "LivroCaixaApiLambda",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="app.main.handler",
            code=_lambda.Code.from_asset("../backend"),
            vpc=vpc,
            environment={
                "DATABASE_URL": f"postgresql://{cluster.cluster_endpoint.hostname}/{cluster.database_name}",
                "USER_POOL_ID": user_pool.user_pool_id,
                "USER_POOL_CLIENT_ID": user_pool_client.user_pool_client_id
            },
            timeout=Stack.of(self).format_arn(
                service="lambda",
                resource="function",
                resource_name="LivroCaixaApiLambda"
            ) # Placeholder for timeout, actually just use Duration
        )
        
        # Correction: use Duration for timeout
        from aws_cdk import Duration
        api_lambda.add_environment("REGION", self.region)
        # Use proper timeout
        api_lambda.timeout = Duration.seconds(30)

        # Grant Lambda access to DB
        cluster.connections.allow_default_port_from(api_lambda)
        cluster.grant_connect(api_lambda)

        # 7. HTTP API Gateway
        http_api = apigwv2.HttpApi(self, "LivroCaixaHttpApi",
            default_integration=integrations.HttpLambdaIntegration("LambdaIntegration", api_lambda)
        )

        CfnOutput(self, "ApiUrl", value=http_api.api_endpoint)
