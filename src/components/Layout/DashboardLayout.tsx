import React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  FileText,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  Filter,
  BarChart3,
  Activity,
  LucideIcon
} from 'lucide-react'
import { useState } from 'react'

// Interface para itens de menu normais
interface MenuItemLink {
  icon: LucideIcon
  label: string
  path: string
}

// Interface para divisores de menu
interface MenuItemDivider {
  type: 'divider'
  label: string
}

// Union type para todos os tipos de itens de menu
type MenuItem = MenuItemLink | MenuItemDivider

// Type guard para verificar se é um item de link
const isMenuItemLink = (item: MenuItem): item is MenuItemLink => {
  return 'path' in item
}

// Type guard para verificar se é um divisor
const isMenuItemDivider = (item: MenuItem): item is MenuItemDivider => {
  return 'type' in item && item.type === 'divider'
}

const DashboardLayout = () => {
  const { userProfile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (signingOut) return // Prevenir múltiplos cliques
    
    setSigningOut(true)
    try {
      await signOut()
      // O redirecionamento é tratado pelo AuthContext
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      setSigningOut(false)
    }
  }

  const getMenuItems = (): MenuItem[] => {
    const commonItems: MenuItemLink[] = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: TrendingUp, label: 'Investimentos', path: '/investments' }
    ]

    if (userProfile?.user_roles?.role_name === 'Global') {
      return [
        ...commonItems,
        { icon: Users, label: 'Usuários', path: '/users' },
        { icon: FileText, label: 'Debêntures', path: '/debentures' },
        { icon: DollarSign, label: 'Comissões', path: '/comissoes' },
        { icon: DollarSign, label: 'Remuneração', path: '/remuneracao' },
        { type: 'divider', label: 'Áreas Manus' },
        { icon: DollarSign, label: 'Comissões Manus', path: '/comissoes-manus' },
        { icon: TrendingUp, label: 'Remuneração Manus', path: '/remuneracao-manus' },
        { icon: Activity, label: 'Logs de Auditoria', path: '/audit' },
        { icon: Settings, label: 'Configurações', path: '/settings' }
      ]
    }

    if (userProfile?.user_roles?.role_name === 'Master' || userProfile?.user_roles?.role_name === 'Escritório') {
      return [
        ...commonItems,
        { icon: Users, label: 'Minha Rede', path: '/network' },
        { icon: DollarSign, label: 'Comissões', path: '/comissoes' },
        { icon: DollarSign, label: 'Remuneração', path: '/remuneracao' },
        { type: 'divider', label: 'Áreas Manus' },
        { icon: DollarSign, label: 'Comissões Manus', path: '/comissoes-manus' },
        { icon: TrendingUp, label: 'Remuneração Manus', path: '/remuneracao-manus' },
        { icon: Activity, label: 'Logs de Auditoria', path: '/audit' },
        { icon: Settings, label: 'Configurações', path: '/settings' }
      ]
    }

    if (userProfile?.user_roles?.role_name === 'Assessor') {
      return [
        ...commonItems,
        { icon: Users, label: 'Meus Clientes', path: '/clients' },
        { icon: DollarSign, label: 'Minhas Comissões', path: '/my-commissions' },
        { type: 'divider', label: 'Áreas Manus' },
        { icon: DollarSign, label: 'Comissões Manus', path: '/comissoes-manus' },
        { icon: TrendingUp, label: 'Remuneração Manus', path: '/remuneracao-manus' },
        { icon: Settings, label: 'Configurações', path: '/settings' }
      ]
    }

    // Investidor
    return [
      { icon: LayoutDashboard, label: 'Minha Carteira', path: '/portfolio' },
      { icon: TrendingUp, label: 'Performance', path: '/performance' },
      { icon: FileText, label: 'Meus Investimentos', path: '/my-investments' },
      { icon: Settings, label: 'Configurações', path: '/settings' }
    ]
  }

  const menuItems = getMenuItems()

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <div className={`bg-white shadow-lg w-64 transition-all duration-300 hidden lg:flex lg:flex-shrink-0`}>
        <div className="w-full flex flex-col">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-blue-600">Smooth</h1>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                {userProfile?.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userProfile?.full_name}
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  {userProfile?.user_roles?.role_name}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item, index) => {
              if (isMenuItemDivider(item)) {
                return (
                  <div key={`divider-${index}`} className="pt-4 pb-2">
                    <div className="border-t border-gray-200 mb-2"></div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
                      {item.label}
                    </h3>
                  </div>
                )
              }
              
              if (isMenuItemLink(item)) {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </Link>
                )
              }
              
              return null
            })}
          </nav>

          {/* Sign Out */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="mr-3 h-5 w-5" />
              {signingOut ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          {/* Mobile sidebar content - same as desktop */}
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center justify-center px-4">
              <h1 className="text-2xl font-bold text-blue-600">Smooth</h1>
            </div>
            <div className="mt-5 px-4">
              <div className="flex items-center space-x-3 p-2">
                <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                  {userProfile?.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {userProfile?.full_name}
                  </p>
                  <p className="text-xs text-blue-600 font-medium">
                    {userProfile?.user_roles?.role_name}
                  </p>
                </div>
              </div>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {menuItems.map((item, index) => {
                if (isMenuItemDivider(item)) {
                  return (
                    <div key={`mobile-divider-${index}`} className="pt-4 pb-2">
                      <div className="border-t border-gray-200 mb-2"></div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
                        {item.label}
                      </h3>
                    </div>
                  )
                }
                
                if (isMenuItemLink(item)) {
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                        isActive
                          ? 'bg-blue-100 text-blue-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="mr-4 h-6 w-6" />
                      {item.label}
                    </Link>
                  )
                }
                
                return null
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center w-full px-2 py-2 text-base font-medium text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="mr-4 h-6 w-6" />
              {signingOut ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 w-full min-h-screen flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex-shrink-0">
          <div className="flex items-center justify-between h-16 px-4 bg-white shadow">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-blue-600">Smooth</h1>
            <div className="w-6 h-6" /> {/* Spacer */}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 w-full overflow-y-auto">
          <div className="w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout