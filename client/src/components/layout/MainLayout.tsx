import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useBotStore } from '../../stores/bot.store';
import { useEffect, useState } from 'react';
import {
  Bot,
  LayoutDashboard,
  LogOut,
  Settings,
  Blocks,
  MessageCircle,
  Users,
  Radio,
  ChevronRight,
  ChevronDown,
  Home,
  TrendingUp,
  BarChart3,
  Workflow,
  Hash,
  Zap,
} from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  children?: NavItem[];
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, logout } = useAuthStore();
  const { currentBot, loadBot } = useBotStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['automation']);

  // Extract botId from URL if present
  const botIdMatch = location.pathname.match(/\/bots\/([^/]+)/);
  const botId = botIdMatch ? botIdMatch[1] : null;
  const isInBotContext = botId && botId !== 'undefined';

  useEffect(() => {
    if (isInBotContext && (!currentBot || currentBot.id !== botId)) {
      loadBot(botId);
    }
  }, [botId, currentBot, loadBot, isInBotContext]);

  // Auto-expand Automation if we're on a child route
  useEffect(() => {
    if (
      location.pathname.includes('/flows') ||
      location.pathname.includes('/blocks') ||
      location.pathname.includes('/keywords')
    ) {
      setExpandedMenus((prev) => (prev.includes('automation') ? prev : [...prev, 'automation']));
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId]
    );
  };

  const mainNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/bots', label: 'Bots', icon: Bot },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const botNavItems: NavItem[] = isInBotContext
    ? [
        { path: `/bots/${botId}`, label: 'Home', icon: Home, exact: true },
        {
          path: 'automation',
          label: 'Automation',
          icon: Zap,
          children: [
            { path: `/bots/${botId}/flows`, label: 'Flows', icon: Workflow },
            { path: `/bots/${botId}/blocks`, label: 'Blocks', icon: Blocks },
            { path: `/bots/${botId}/keywords`, label: 'Keywords', icon: Hash },
          ],
        },
        { path: `/bots/${botId}/live-chat`, label: 'Live Chat', icon: MessageCircle },
        { path: `/bots/${botId}/people`, label: 'People', icon: Users },
        { path: `/bots/${botId}/broadcasts`, label: 'Re-engage', icon: Radio },
        { path: `/bots/${botId}/grow`, label: 'Grow', icon: TrendingUp },
        { path: `/bots/${botId}/analyze`, label: 'Analyze', icon: BarChart3 },
        { path: `/bots/${botId}/settings`, label: 'Configure', icon: Settings },
      ]
    : [];

  const isActiveRoute = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isParentActive = (children?: NavItem[]) => {
    if (!children) return false;
    return children.some((child) => isActiveRoute(child.path));
  };

  const renderNavItem = (item: NavItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.path);
    const isActive = hasChildren ? isParentActive(item.children) : isActiveRoute(item.path, item.exact);

    if (hasChildren) {
      return (
        <div key={item.path}>
          <button
            onClick={() => toggleMenu(item.path)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5" />
              {item.label}
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children!.map((child) => {
                const childActive = isActiveRoute(child.path);
                return (
                  <Link
                    key={child.path}
                    to={child.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      childActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <child.icon className="w-4 h-4" />
                    {child.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
      >
        <item.icon className="w-5 h-5" />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-slate-800 text-white">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-700">
            <Bot className="w-7 h-7 text-blue-400" />
            <span className="text-lg font-bold">ChatBot Builder</span>
          </div>

          {/* Bot Selector (when in bot context) */}
          {isInBotContext && currentBot && (
            <div className="px-3 py-3 border-b border-slate-700">
              <Link
                to="/bots"
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{currentBot.name}</p>
                  <p className="text-xs text-slate-400">Switch bot</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {/* Bot Navigation (when in bot context) */}
            {isInBotContext ? (
              <>{botNavItems.map(renderNavItem)}</>
            ) : (
              /* Main Navigation (when not in bot context) */
              <>
                {mainNavItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* User */}
          <div className="px-3 py-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user?.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen">{children}</main>
    </div>
  );
}
