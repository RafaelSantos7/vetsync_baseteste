
export type AppRole = 'admin' | 'veterinarian' | 'reception';

export interface ModuleAccess {
  title: string;
  url: string;
  roles: AppRole[];
}

export const MODULES = {
  PRINCIPAL: [
    { title: 'Dashboard', url: '/dashboard', roles: ['admin', 'veterinarian', 'reception'] },
    { title: 'Agenda', url: '/agenda', roles: ['admin', 'veterinarian', 'reception'] },
    { title: 'Clientes', url: '/clientes', roles: ['admin', 'veterinarian', 'reception'] },
    { title: 'Animais', url: '/animais', roles: ['admin', 'veterinarian', 'reception'] },
  ],
  CLINICO: [
    { title: 'Prontuários', url: '/prontuarios', roles: ['admin', 'veterinarian'] },
    { title: 'Vacinas', url: '/vacinas', roles: ['admin', 'veterinarian'] },
    { title: 'Odontograma Equino', url: '/odontograma', roles: ['admin', 'veterinarian'] },
  ],
  OPERACIONAL: [
    { title: 'Visitas Rurais', url: '/rural', roles: ['admin', 'veterinarian', 'reception'] },
    { title: 'Financeiro', url: '/financeiro', roles: ['admin', 'veterinarian'] },
    { title: 'Configurações', url: '/configuracoes', roles: ['admin', 'veterinarian'] },
  ]
} as const;

export function canAccessModule(role: string | undefined, url: string): boolean {
  const normalizedRole = normalizeRole(role);
  
  if (import.meta.env.DEV) {
    console.log(`[Permissions] Checking access for ${url} with role: ${normalizedRole} (raw: ${role})`);
  }

  // Admin has access to everything
  if (normalizedRole === 'admin') return true;

  const allModules = [
    ...MODULES.PRINCIPAL,
    ...MODULES.CLINICO,
    ...MODULES.OPERACIONAL
  ];
  
  const module = allModules.find(m => m.url === url || url.startsWith(m.url + '/'));
  if (!module) return true; // Public or unknown routes
  
  const hasAccess = (module.roles as readonly string[]).includes(normalizedRole);
  
  if (import.meta.env.DEV && !hasAccess) {
    console.warn(`[Permissions] Access DENIED for ${url} (required: ${module.roles.join(', ')})`);
  }

  return hasAccess;
}

export function normalizeRole(role: string | undefined): AppRole {
  if (!role) return 'reception';
  
  const r = role.toLowerCase().trim();
  
  // Mapping synonyms to standard roles
  if (['admin', 'owner', 'proprietario', 'proprietário', 'administrator'].includes(r)) return 'admin';
  if (['veterinarian', 'veterinario', 'veterinário', 'vet'].includes(r)) return 'veterinarian';
  if (['reception', 'recepcao', 'recepção', 'recepcionista'].includes(r)) return 'reception';
  
  // Handle specific organization_members roles if they bleed through
  if (r === 'member') return 'veterinarian';
  if (r === 'viewer') return 'reception';

  return 'reception'; // Default to lowest permission
}

export function getRoleLabel(role: string | undefined): string {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case 'admin': return 'Administrador';
    case 'veterinarian': return 'Veterinário';
    case 'reception': return 'Recepção';
    default: return 'Recepção';
  }
}
