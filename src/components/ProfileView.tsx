import { useState, useEffect, useRef } from 'react';
import { getDatabase, saveDatabase } from '@/lib/database';
import type { Settings, CustomField } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, Church, User, Plus, Trash2, Camera, MapPin, Briefcase, Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ProfileView = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [settings, setSettings] = useState<Settings>({
    id: 1, entityName: '', entityType: 'Empresa', country: 'Brasil', currency: 'BRL',
    customFieldsSchema: '[]', profileImage: ''
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const db = await getDatabase();
    const result = db.exec("SELECT * FROM settings LIMIT 1");
    if (result.length > 0) {
      const r = result[0].values[0];
      const schema = r[5] as string || '[]';
      
      setSettings({
        id: r[0] as number,
        entityName: r[1] as string || '',
        entityType: (r[2] as any === 'Sociedade' ? 'Pessoal' : r[2] as any) || 'Empresa',
        country: r[3] as string || 'Brasil',
        currency: r[4] as string || 'BRL',
        customFieldsSchema: schema,
        printSettings: r[6] as string || '',
        profileImage: r[7] as string || ''
      });
      
      try { 
        const parsedSchema = JSON.parse(schema);
        setCustomFields(Array.isArray(parsedSchema) ? parsedSchema : []); 
      } catch (e) { 
        setCustomFields([]); 
      }
    }
  };

  const handleSave = async () => {
    const db = await getDatabase();
    const schema = JSON.stringify(customFields);
    
    db.run(
      "UPDATE settings SET entityName = ?, entityType = ?, country = ?, customFieldsSchema = ?, profileImage = ? WHERE id = ?",
      [settings.entityName, settings.entityType, settings.country, schema, settings.profileImage || null, settings.id]
    );
    
    saveDatabase(db);
    toast({ title: "Perfil atualizado com sucesso!" });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, profileImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { label: '', value: '' }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index: number, key: 'label' | 'value', val: string) => {
    const newFields = [...customFields];
    newFields[index][key] = val;
    setCustomFields(newFields);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Meu Perfil</h2>
          <p className="text-muted-foreground mt-1">Gerencie as informações da sua entidade e personalize sua experiência.</p>
        </div>
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
          Salvar Alterações
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Avatar & Identity */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center space-y-6 relative overflow-hidden group">
            <div className="relative">
              <div className="w-40 h-40 rounded-full border-4 border-primary/20 overflow-hidden bg-secondary flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover:scale-105">
                {settings.profileImage ? (
                  <img src={settings.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-primary opacity-40">
                    {settings.entityType === 'Empresa' ? <Building2 size={64} /> : settings.entityType === 'Igreja' ? <Church size={64} /> : <User size={64} />}
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 p-3 rounded-full bg-primary text-primary-foreground shadow-xl hover:scale-110 transition-all duration-300"
              >
                <Camera size={18} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>

            <div>
              <h3 className="text-xl font-bold">{settings.entityName || 'Nome da Entidade'}</h3>
              <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Briefcase size={12} /> {settings.entityType}
              </p>
            </div>

            <div className="w-full pt-6 border-t border-white/5 space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Globe size={14} className="text-primary" />
                <span>{settings.country || 'Brasil'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin size={14} className="text-primary" />
                <span>Localização Padrão</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Forms */}
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Info */}
          <div className="glass-panel p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <User className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">Informações Básicas</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Nome da Entidade / Usuário</Label>
                <Input 
                  className="bg-background/50 border-white/10" 
                  value={settings.entityName} 
                  onChange={(e) => setSettings({...settings, entityName: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Entidade</Label>
                <Select value={settings.entityType} onValueChange={(v) => setSettings({...settings, entityType: v as any})}>
                  <SelectTrigger className="bg-background/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-none">
                    <SelectItem value="Empresa">Empresa</SelectItem>
                    <SelectItem value="Igreja">Igreja / ONG</SelectItem>
                    <SelectItem value="Pessoal">Pessoal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>País / Região</Label>
                <Input 
                  className="bg-background/50 border-white/10" 
                  value={settings.country} 
                  onChange={(e) => setSettings({...settings, country: e.target.value})} 
                />
              </div>
            </div>
          </div>

          {/* Custom Fields (Campos Extras) */}
          <div className="glass-panel p-8 rounded-3xl space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Campos Personalizados</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={addCustomField} className="text-primary hover:bg-primary/10">
                <Plus className="w-4 h-4 mr-1" /> Adicionar Campo
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">Estes campos aparecerão no cabeçalho dos seus relatórios impressos.</p>

            <div className="space-y-4">
              {customFields.map((field, index) => (
                <div key={index} className="flex gap-4 items-end animate-in slide-in-from-left-2 duration-300">
                  <div className="flex-1 space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Rótulo (ex: CNPJ, Endereço)</Label>
                    <Input 
                      className="bg-background/50 border-white/10" 
                      value={field.label} 
                      onChange={(e) => updateCustomField(index, 'label', e.target.value)} 
                    />
                  </div>
                  <div className="flex-[2] space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Valor</Label>
                    <Input 
                      className="bg-background/50 border-white/10" 
                      value={field.value} 
                      onChange={(e) => updateCustomField(index, 'value', e.target.value)} 
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeCustomField(index)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {customFields.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-2xl">
                  <p className="text-sm text-muted-foreground">Nenhum campo personalizado adicionado ainda.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
