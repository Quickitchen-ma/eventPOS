import { useEffect, useState, useRef } from 'react';
import { BarChart3, TrendingUp, DollarSign, Package, AlertTriangle, Clock, Users, ShoppingCart, Menu, Settings, Plus, Edit, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import type { Branch, Menu as MenuType, Category, Product } from '../lib/database.types';
import { APP_NAME, APP_VERSION } from '../lib/version';

interface BranchStats {
  branch: Branch;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalRevenue: number;
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
  totalOrders: number;
  pendingOrders: number;
  previousPeriodRevenue: number;
  previousPeriodOrders: number;
}

interface RevenueTrend {
  date: string;
  revenue: number;
  orders: number;
}

interface CategorySales {
  category: string;
  revenue: number;
  orders: number;
}

export function ManagerDashboard() {
  const [branches, setBranches] = useState<BranchStats[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(true);
  const [revenueTrends, setRevenueTrends] = useState<RevenueTrend[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [menus, setMenus] = useState<MenuType[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [showMenuManagement, setShowMenuManagement] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuType | null>(null);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuName, setMenuName] = useState('');
  const [menuDescription, setMenuDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [productCategoryId, setProductCategoryId] = useState('');
  const [productAvailable, setProductAvailable] = useState(true);
  const [productSortOrder, setProductSortOrder] = useState(0);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryImageUrl, setCategoryImageUrl] = useState('');
  const [categorySortOrder, setCategorySortOrder] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageSource, setImageSource] = useState<'url' | 'library'>('library');
  const [libraryImages, setLibraryImages] = useState<string[]>([]);
  const menuManagementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadStats = async () => {
    const { data: branchesData, error: branchesError } = await supabase
      .from('branches')
      .select('*')
      .order('created_at');

    if (branchesError) {
      console.error('Error loading branches:', branchesError);
      setLoading(false);
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const prevWeekAgo = new Date(weekAgo);
    prevWeekAgo.setDate(prevWeekAgo.getDate() - 7);
    const prevMonthAgo = new Date(monthAgo);
    prevMonthAgo.setMonth(prevMonthAgo.getMonth() - 1);

    const stats = await Promise.all(
      (branchesData || []).map(async (branch) => {
        // Completed orders
        const { data: allOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'completed')
          .eq('branch_id', branch.id);

        const { data: todayOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'completed')
          .eq('branch_id', branch.id)
          .gte('created_at', today.toISOString());

        const { data: weekOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'completed')
          .eq('branch_id', branch.id)
          .gte('created_at', weekAgo.toISOString());

        const { data: monthOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'completed')
          .eq('branch_id', branch.id)
          .gte('created_at', monthAgo.toISOString());

        // Pending orders
        const { data: pendingOrders } = await supabase
          .from('orders')
          .select('*')
          .neq('status', 'completed')
          .eq('branch_id', branch.id);

        // Previous period for comparison
        const { data: prevWeekOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'completed')
          .eq('branch_id', branch.id)
          .gte('created_at', prevWeekAgo.toISOString())
          .lt('created_at', weekAgo.toISOString());

        const { data: prevMonthOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'completed')
          .eq('branch_id', branch.id)
          .gte('created_at', prevMonthAgo.toISOString())
          .lt('created_at', monthAgo.toISOString());

        const todayRevenue = (todayOrders || []).reduce((sum, o) => sum + o.total, 0);
        const weekRevenue = (weekOrders || []).reduce((sum, o) => sum + o.total, 0);
        const monthRevenue = (monthOrders || []).reduce((sum, o) => sum + o.total, 0);
        const totalRevenue = (allOrders || []).reduce((sum, o) => sum + o.total, 0);
        const prevWeekRevenue = (prevWeekOrders || []).reduce((sum, o) => sum + o.total, 0);
        const prevMonthRevenue = (prevMonthOrders || []).reduce((sum, o) => sum + o.total, 0);

        return {
          branch,
          todayRevenue,
          weekRevenue,
          monthRevenue,
          totalRevenue,
          todayOrders: (todayOrders || []).length,
          weekOrders: (weekOrders || []).length,
          monthOrders: (monthOrders || []).length,
          totalOrders: (allOrders || []).length,
          pendingOrders: (pendingOrders || []).length,
          previousPeriodRevenue: timeRange === 'week' ? prevWeekRevenue : prevMonthRevenue,
          previousPeriodOrders: timeRange === 'week' ? (prevWeekOrders || []).length : (prevMonthOrders || []).length,
        };
      })
    );

    setBranches(stats);
    if (stats.length > 0 && !selectedBranch) {
      setSelectedBranch(stats[0].branch.id);
    }

    // Load revenue trends for the last 30 days
    await loadRevenueTrends();

    // Load category sales
    await loadCategorySales();

    // Check for alerts
    checkAlerts(stats);

    // Load menu data
    await loadMenus();
    await loadAllCategories();
    await loadAllProducts();
    await loadLibraryImages();

    setLoading(false);
  };

  const loadMenus = async () => {
    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .order('created_at');

    if (error) {
      console.error('Error loading menus:', error);
      return;
    }

    setMenus(data || []);
  };

  const loadAllCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error loading categories:', error);
      return;
    }

    setAllCategories(data || []);
  };

  const loadAllProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error loading products:', error);
      return;
    }

    setAllProducts(data || []);
  };

  const loadLibraryImages = async () => {
    // For now, we'll hardcode the library images since we can't dynamically read the folder
    // In a real application, you might want to create an API endpoint to list these files
    const images = [
      '2021-12-04-61abb64c41432.png',
      '2021-12-08-61b0c9de723d3.png',
      '2021-12-08-61b0c93eb8b19.png',
      '2021-12-08-61b0ca4f2dd20.png',
      '2021-12-08-61b0cb587ec50.png',
      '2021-12-08-61b0cc6f2102a.png',
      '2021-12-08-61b0d02a06972.png',
      '2021-12-08-61b0d7a5d1e43.png',
      '2021-12-08-61b0d7dd04436.png',
      '2021-12-08-61b0d9c8d26b7.png',
      '2021-12-08-61b0d98c656df.png',
      '2021-12-08-61b0d00584d95.png',
      '2021-12-08-61b0d962e9eb0.png',
      '2021-12-08-61b0d7895c900.png',
      '2021-12-08-61b0d43422e39.png',
      '2021-12-08-61b0da006af72.png',
      '2021-12-08-61b0dae57d44b.png',
      '2021-12-08-61b0db0822aa3.png',
      '2021-12-08-61b0db764682c.png',
      '2021-12-08-61b0dbb38e9e2.png',
      '2021-12-08-61b0dbfd44f0f.png',
      '2021-12-08-61b0dc1f062cc.png',
      '2021-12-08-61b0dc3c8cead.png',
      '2021-12-08-61b0dc6c88807.png',
      '2021-12-08-61b0dcacc238b.png',
      '2021-12-08-61b0dcd69f395.png',
      '2021-12-08-61b0dd2b8d561.png',
      '2021-12-08-61b0dd4a092d4.png',
      '2021-12-08-61b0dd7ebe3b8.png',
      '2021-12-08-61b0dd11a53d0.png',
      '2021-12-08-61b0dd6108261.png',
      '2021-12-08-61b0ddab0612c.png',
      '2021-12-08-61b0ddd87f07f.png',
      '2021-12-08-61b0ddf80e25a.png',
      '2021-12-08-61b0de4a665d6.png',
      '2021-12-08-61b0de9ce2e88.png',
      '2021-12-08-61b0deb4e58d8.png',
      '2021-12-08-61b0defa701f5.png',
      '2021-12-08-61b0df3ed9958.png',
      '2021-12-08-61b0df9bd0c3f.png',
      '2021-12-08-61b0df6244b0a.png',
      '2021-12-08-61b0df29943de.png',
      '2021-12-08-61b0dfbad410e.png',
      '2021-12-08-61b0dfd530fe2.png',
      '2021-12-08-61b0e031d6bc4.png',
      '2021-12-08-61b0e0087df80.png',
      '2022-10-20-6351c1fcb4abb.png',
      '2022-10-20-6351c4e1274b9.png',
      '2022-10-20-6351c5cdd18aa.png',
      '2022-10-20-6351c7e21787f.png',
      '2022-10-20-6351c8ce714fa.png',
      '2022-10-20-6351c10a0e6ba.png',
      '2022-10-20-6351c852c9613.png',
      '2022-10-20-6351c982cf00b.png',
      '2022-10-20-6351ca231ce86.png',
      '2022-10-20-6351ca60608e6.png',
      '2022-10-20-6351caa48213d.png',
      '2022-10-20-6351cbc2782f2.png',
      '2022-10-20-6351cbf29b65f.png',
      '2022-10-20-6351cf791962a.png',
      '2022-10-20-6351cfc526f62.png',
      '2022-10-20-6351cff99f6c9.png',
      '2022-10-20-6351d0f510660.png',
      '2022-10-20-6351d0fbc3e2f.png',
      '2022-10-20-6351d0448b864.png',
      '2022-10-20-635193eb6d20a.png',
      '2022-10-21-6351d52989468.png',
      '2023-01-31-63d973a649f51.png',
      '2023-01-31-63d973d70dfd8.png',
      '2023-01-31-63d973df08584.png',
      '2023-01-31-63d973e71d1e1.png',
      '2023-01-31-63d973e6722d8.png',
      '2023-01-31-63d974f759302.png',
      '2023-01-31-63d9739f6bebc.png',
      '2023-04-24-6446e8d5b359e.png',
      '2023-04-24-6446e8dc714e4.png',
      '2023-04-24-6446e8e06d00b.png',
      '2023-04-24-6446e8e35fe6e.png',
      '2023-04-24-6446e8f472e72.png',
      '2023-04-24-6446e9a00a599.png',
      '2023-04-24-6446e9a72cfd9.png',
      '2023-04-24-6446e9a4444d8.png',
      '2023-04-24-6446e9e8beb7b.png',
      '2023-04-24-6446e86d2a6ac.png',
      '2023-04-24-6446e95f3f148.png',
      '2023-04-24-6446e97d6457c.png',
      '2023-04-24-6446e99cbab3b.png',
      '2023-04-24-6446e998c0ef7.png',
      '2023-04-24-6446e9098b27c.png',
      '2023-04-24-6446e86894a75.png',
      '2023-04-24-6446e95916fa9.png',
      '2023-04-24-6446e96383bb9.png',
      '2023-04-24-6446e862147aa.png',
      '2023-04-24-6446e8702036a.png',
      '2023-04-24-6446ea0e118d1.png',
      '2023-04-24-6446ea2cd600b.png',
      '2023-04-24-6446ea28b4170.png',
      '2023-04-24-6446ea147c0e2.png',
      '2023-04-24-6446ea12564eb.png',
      '2023-04-24-6446eb3c68fe9.png',
      '2023-04-24-6446eb434d349.png',
      '2023-04-24-6446eb36707b7.png',
      '2023-04-24-6446eb3977857.png',
      '2023-04-24-6446ec6d3d3c9.png',
      '2023-04-24-6446ec6fcd938.png',
      '2023-04-24-6446ec72cc578.png',
      '2023-04-24-6446ec684c81c.png',
      '2023-04-24-6446f5b70fc1f.png',
      '2023-04-24-6446f5c4d28c5.png',
      '2023-04-25-64471cc796086.png',
      '2023-04-25-64471ccc9f2e6.png',
      '2023-04-25-64471ccf5a329.png',
      '2023-04-25-64471d2b7e6f5.png',
      '2023-04-25-64471d2f3c104.png',
      '2023-04-25-64471d26e0fe7.png',
      '2023-04-25-64471d31d70e0.png',
      '2023-04-25-64471d3008853.png',
      '2023-04-25-644701a42aa1c.png',
      '2023-04-25-644701a65caab.png',
      '2023-04-25-644701b5dbfd9.png',
      '2023-04-25-644701c0ebc5f.png',
      '2023-04-25-644701c2d6807.png',
      '2023-04-25-644717d9575fb.png',
      '2023-04-25-644717de5f0ae.png',
      '2023-04-25-644717e0a6e24.png',
      '2023-04-25-644717e2ccca4.png',
      '2023-04-25-644847fcc4573.png',
      '2023-04-25-644848f29e6ff.png',
      '2023-04-25-6447013a7b87c.png',
      '2023-04-25-6447013ed0088.png',
      '2023-04-25-6447017ba5ad9.png',
      '2023-04-25-6447018d19a46.png',
      '2023-04-25-6447024d03175.png',
      '2023-04-25-6447025aa0d72.png',
      '2023-04-25-6447026bdcdce.png',
      '2023-04-25-6447026c1cd3a.png',
      '2023-04-25-6447026c00803.png',
      '2023-04-25-6447027d081aa.png',
      '2023-04-25-6447027e4baed.png',
      '2023-04-25-6447027e6bf66.png',
      '2023-04-25-6447052ea6d1a.png',
      '2023-04-25-6447053a08652.png',
      '2023-04-25-6448483f7b675.png',
      '2023-04-25-6448484b553a4.png',
      '2023-04-25-64470130bbc64.png',
      '2023-04-25-64470266f093e.png',
      '2023-04-25-64470271a0bcb.png',
      '2023-04-25-64470276ca456.png',
      '2023-04-25-64472143a6160.png',
      '2023-04-25-64472145bf7ff.png',
      '2023-04-25-64484840e4579.png',
      '2023-04-25-64484843aff25.png',
      '2023-04-25-64484845cf125.png',
      '2023-04-25-64484852db8d1.png',
      '2023-04-25-644702715d5c8.png',
      '2023-04-25-644721405b9de.png',
      '2023-04-25-644848517f1ad.png',
      '2023-04-25-644848544a25e.png',
      '2023-04-25-6447018170e71.png',
      '2023-04-25-64470192594b0.png',
      '2023-04-25-644848333589b.png',
      '2023-04-25-6448483925619.png',
      '2023-04-26-644878ff4d2e8.png',
      '2023-04-26-644879473fd43.png',
      '2023-04-26-64487928655b4.png',
      '2023-04-26-644879062400c.png',
      '2023-09-06-64f83b1948ac3.png',
      '2023-11-08-654bc042e8fb3.png',
      '2023-12-29-658f239342fbe.png',
      '2023-12-29-658f24574886a.png',
      '2024-08-02-66acf7cfa8cb4.png',
      '2024-08-02-66acf8a882c1d.png',
      '2024-08-02-66acf943a2a8e.png',
      '2024-08-02-66acf79158c8b.png',
      '2024-08-02-66acfa2c7a0a8.png',
      '2024-08-02-66acfa71c5545.png',
      '2024-08-02-66acfad3202ba.png',
      '2024-08-02-66acfb2f8fba3.png',
      '2024-08-02-66acfb665db9c.png',
      '2024-08-02-66acfea22874b.png',
      '2024-08-02-66acfee5a2476.png',
      '2024-08-02-66acff13c121d.png',
      '2024-08-02-66acff637dc16.png',
      '2024-08-02-66acff810bbb4.png',
      '2024-08-02-66acffe8cb2ab.png',
      '2024-08-02-66ad0ace7a1ef.png',
      '2024-08-02-66ad0b3a1bb3a.png',
      '2024-08-02-66ad0b7f9dbe4.png',
      '2024-08-02-66ad0bd117788.png',
      '2024-08-02-66ad0fb7b16fa.png',
      '2024-08-02-66ad06f4ea23e.png',
      '2024-08-02-66ad07bd111e8.png',
      '2024-08-02-66ad09bccc6a7.png',
      '2024-08-02-66ad10ddd098b.png',
      '2024-08-02-66ad074a18d7b.png',
      '2024-08-02-66ad0604e217d.png',
      '2024-08-02-66ad0888c2d6e.png',
      '2024-08-02-66ad1017cf96f.png',
      '2024-08-02-66ad10641a573.png',
      '2024-08-02-66ad06743607f.png'
    ];
    setLibraryImages(images);
  };

  const createMenu = async (name: string, description: string) => {
    const { data, error } = await supabase
      .from('menus')
      .insert({ name, description })
      .select()
      .single();

    if (error) {
      console.error('Error creating menu:', error);
      return null;
    }

    await loadMenus();
    return data;
  };

  const updateMenu = async (menuId: string, name: string, description: string) => {
    const { error } = await supabase
      .from('menus')
      .update({ name, description })
      .eq('id', menuId);

    if (error) {
      console.error('Error updating menu:', error);
      return false;
    }

    await loadMenus();
    return true;
  };

  const deleteMenu = async (menuId: string) => {
    const { error } = await supabase
      .from('menus')
      .delete()
      .eq('id', menuId);

    if (error) {
      console.error('Error deleting menu:', error);
      return false;
    }

    await loadMenus();
    return true;
  };

  const assignMenuToBranch = async (branchId: string, menuId: string) => {
    const { error } = await supabase
      .from('branches')
      .update({ menu_id: menuId })
      .eq('id', branchId);

    if (error) {
      console.error('Error assigning menu to branch:', error);
      return false;
    }

    await loadStats(); // Reload stats to update branch data
    return true;
  };

  const updateMenuCategories = async (menuId: string, categoryIds: string[]) => {
    // First, remove existing categories
    await supabase
      .from('menu_categories')
      .delete()
      .eq('menu_id', menuId);

    // Then add new categories
    if (categoryIds.length > 0) {
      const menuCategories = categoryIds.map((categoryId, index) => ({
        menu_id: menuId,
        category_id: categoryId,
        sort_order: index,
      }));

      const { error } = await supabase
        .from('menu_categories')
        .insert(menuCategories);

      if (error) {
        console.error('Error updating menu categories:', error);
        return false;
      }
    }

    return true;
  };

  const openCreateMenuModal = () => {
    setEditingMenu(null);
    setMenuName('');
    setMenuDescription('');
    setSelectedCategories([]);
    setShowMenuModal(true);
  };

  const openEditMenuModal = async (menu: MenuType) => {
    setEditingMenu(menu);
    setMenuName(menu.name);
    setMenuDescription(menu.description || '');

    // Load current categories for this menu
    const { data, error } = await supabase
      .from('menu_categories')
      .select('category_id')
      .eq('menu_id', menu.id);

    if (error) {
      console.error('Error loading menu categories:', error);
      return;
    }

    setSelectedCategories((data || []).map(item => item.category_id));
    setShowMenuModal(true);
  };

  const saveMenu = async () => {
    if (!menuName.trim()) {
      alert('Le nom du menu est requis');
      return;
    }

    let menuId: string;

    if (editingMenu) {
      // Update existing menu
      const success = await updateMenu(editingMenu.id, menuName, menuDescription);
      if (!success) {
        alert('Erreur lors de la mise à jour du menu');
        return;
      }
      menuId = editingMenu.id;
    } else {
      // Create new menu
      const newMenu = await createMenu(menuName, menuDescription);
      if (!newMenu) {
        alert('Erreur lors de la création du menu');
        return;
      }
      menuId = newMenu.id;
    }

    // Update menu categories
    const success = await updateMenuCategories(menuId, selectedCategories);
    if (!success) {
      alert('Erreur lors de la mise à jour des catégories du menu');
      return;
    }

    setShowMenuModal(false);
    setEditingMenu(null);
    setMenuName('');
    setMenuDescription('');
    setSelectedCategories([]);
  };

  const handleDeleteMenu = async (menuId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce menu ?')) {
      return;
    }

    const success = await deleteMenu(menuId);
    if (!success) {
      alert('Erreur lors de la suppression du menu');
    }
  };

  const openCreateProductModal = () => {
    setEditingProduct(null);
    setProductName('');
    setProductDescription('');
    setProductPrice('');
    setProductImageUrl('');
    setProductCategoryId(allCategories[0]?.id || '');
    setProductAvailable(true);
    setProductSortOrder(0);
    setImageSource('library');
    setShowProductModal(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductDescription(product.description || '');
    setProductPrice(product.price.toString());
    setProductImageUrl(product.image_url || '');
    setProductCategoryId(product.category_id || '');
    setProductAvailable(product.available || true);
    setProductSortOrder(product.sort_order || 0);
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    if (!productName.trim() || !productPrice.trim() || !productCategoryId) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const price = parseFloat(productPrice);
    if (isNaN(price) || price < 0) {
      alert('Le prix doit être un nombre positif');
      return;
    }

    let productId: string;

    if (editingProduct) {
      // Update existing product
      const { error } = await supabase
        .from('products')
        .update({
          name: productName,
          description: productDescription,
          price: price,
          image_url: productImageUrl,
          category_id: productCategoryId,
          available: productAvailable,
          sort_order: productSortOrder,
        })
        .eq('id', editingProduct.id);

      if (error) {
        console.error('Error updating product:', error);
        alert('Erreur lors de la mise à jour du produit');
        return;
      }
      productId = editingProduct.id;
    } else {
      // Create new product
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: productName,
          description: productDescription,
          price: price,
          image_url: productImageUrl,
          category_id: productCategoryId,
          available: productAvailable,
          sort_order: productSortOrder,
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Error creating product:', error);
        alert('Erreur lors de la création du produit');
        return;
      }
      productId = data.id;
    }

    setShowProductModal(false);
    setEditingProduct(null);
    await loadAllProducts();
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      return;
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Error deleting product:', error);
      alert('Erreur lors de la suppression du produit');
      return;
    }

    await loadAllProducts();
  };

  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryImageUrl('');
    setCategorySortOrder(0);
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryImageUrl(category.image_url || '');
    setCategorySortOrder(category.sort_order || 0);
    setShowCategoryModal(true);
  };

  const saveCategory = async () => {
    if (!categoryName.trim()) {
      alert('Le nom de la catégorie est requis');
      return;
    }

    if (editingCategory) {
      // Update existing category
      const { error } = await supabase
        .from('categories')
        .update({
          name: categoryName,
          image_url: categoryImageUrl,
          sort_order: categorySortOrder,
        })
        .eq('id', editingCategory.id);

      if (error) {
        console.error('Error updating category:', error);
        alert('Erreur lors de la mise à jour de la catégorie');
        return;
      }
    } else {
      // Create new category
      const { error } = await supabase
        .from('categories')
        .insert({
          name: categoryName,
          image_url: categoryImageUrl,
          sort_order: categorySortOrder,
        });

      if (error) {
        console.error('Error creating category:', error);
        alert('Erreur lors de la création de la catégorie');
        return;
      }
    }

    setShowCategoryModal(false);
    setEditingCategory(null);
    await loadAllCategories();
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Tous les produits associés seront également supprimés.')) {
      return;
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Error deleting category:', error);
      alert('Erreur lors de la suppression de la catégorie');
      return;
    }

    await loadAllCategories();
    await loadAllProducts(); // Refresh products as some may have been deleted
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        if (uploadError.message.includes('Bucket not found')) {
          alert('Le bucket de stockage "images" n\'existe pas. Veuillez le créer dans Supabase Dashboard > Storage, ou utilisez une URL d\'image directe.');
        } else if (uploadError.message.includes('row-level security policy')) {
          alert('Le bucket "images" a des politiques de sécurité qui bloquent le téléchargement. Allez dans Supabase Dashboard > Storage > images > Settings et désactivez RLS, ou utilisez une URL d\'image directe.');
        } else {
          alert('Erreur lors du téléchargement de l\'image: ' + uploadError.message);
        }
        return null;
      }

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Unexpected error uploading image:', error);
      alert('Erreur inattendue lors du téléchargement. Utilisez une URL d\'image directe.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5MB');
      return;
    }

    const imageUrl = await uploadImage(file);
    if (imageUrl) {
      setProductImageUrl(imageUrl);
    }
  };

  const handleCategoryImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5MB');
      return;
    }

    const imageUrl = await uploadImage(file);
    if (imageUrl) {
      setCategoryImageUrl(imageUrl);
    }
  };

  const loadRevenueTrends = async () => {
    const now = new Date();
    const trends: RevenueTrend[] = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'completed')
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());

      const revenue = (orders || []).reduce((sum, o) => sum + o.total, 0);
      const orderCount = (orders || []).length;

      trends.push({
        date: startOfDay.toISOString().split('T')[0],
        revenue,
        orders: orderCount,
      });
    }

    setRevenueTrends(trends);
  };

  const loadCategorySales = async () => {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        price,
        quantity,
        products (
          category_id,
          categories (
            name
          )
        )
      `);

    const categoryMap = new Map<string, { revenue: number; orders: number }>();

    (orderItems || []).forEach(item => {
      const categoryName = item.products?.categories?.name || 'Uncategorized';
      const revenue = item.price * item.quantity;

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, { revenue: 0, orders: 0 });
      }

      const current = categoryMap.get(categoryName)!;
      current.revenue += revenue;
      current.orders += 1;
    });

    const categorySalesData: CategorySales[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      revenue: data.revenue,
      orders: data.orders,
    })).sort((a, b) => b.revenue - a.revenue);

    setCategorySales(categorySalesData);
  };

  const checkAlerts = (stats: BranchStats[]) => {
    const newAlerts: string[] = [];

    stats.forEach(stat => {
      const currentRevenue = getCurrentRevenue(stat);
      const previousRevenue = stat.previousPeriodRevenue;

      if (previousRevenue > 0) {
        const changePercent = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
        if (changePercent < -20) {
          newAlerts.push(`${stat.branch.name}: Revenue dropped by ${Math.abs(changePercent).toFixed(1)}% compared to previous ${timeRange}`);
        }
      }

      if (stat.pendingOrders > 10) {
        newAlerts.push(`${stat.branch.name}: ${stat.pendingOrders} pending orders - high volume`);
      }
    });

    setAlerts(newAlerts);
  };

  const getCurrentRevenue = (stat: BranchStats) => {
    switch (timeRange) {
      case 'today':
        return stat.todayRevenue;
      case 'week':
        return stat.weekRevenue;
      case 'month':
        return stat.monthRevenue;
      default:
        return stat.todayRevenue;
    }
  };

  const getCurrentOrders = (stat: BranchStats) => {
    switch (timeRange) {
      case 'today':
        return stat.todayOrders;
      case 'week':
        return stat.weekOrders;
      case 'month':
        return stat.monthOrders;
      default:
        return stat.todayOrders;
    }
  };

  const selectedStats = branches.find((s) => s.branch.id === selectedBranch);
  const totalCompanyRevenue = branches.reduce((sum, s) => sum + getCurrentRevenue(s), 0);
  const totalCompanyOrders = branches.reduce((sum, s) => sum + getCurrentOrders(s), 0);

  const totalPendingOrders = branches.reduce((sum, s) => sum + s.pendingOrders, 0);

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Chargement des statistiques...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Caisse enregistreuse Quickitchen</h1>
        <p className="text-gray-600">Tableau de bord de gestion et analytique multi-succursales</p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Alertes</h3>
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            {alerts.map((alert, index) => (
              <li key={index}>• {alert}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex gap-4">
          {(['today', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                timeRange === range
                  ? 'bg-brand-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {range === 'today' ? "Aujourd'hui" : range === 'week' ? 'Cette semaine' : 'Ce mois'}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            const newState = !showMenuManagement;
            setShowMenuManagement(newState);
            if (newState) {
              // Scroll to menu management section after a short delay to allow rendering
              setTimeout(() => {
                menuManagementRef.current?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start'
                });
              }, 100);
            }
          }}
          className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
            showMenuManagement
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Settings className="w-4 h-4" />
          Gestion des menus
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-4 md:p-6 border-l-4 border-brand-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Revenu total</h3>
            <DollarSign className="w-6 h-6 text-brand-600" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-brand-600 mb-2">
            {totalCompanyRevenue.toFixed(2)} dh
          </p>
          <p className="text-sm text-gray-500">{totalCompanyOrders} commandes</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Revenu moyen</h3>
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-blue-600 mb-2">
            {totalCompanyOrders > 0
              ? (totalCompanyRevenue / totalCompanyOrders).toFixed(2)
              : '0.00'} dh
          </p>
          <p className="text-sm text-gray-500">Par commande</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Commandes en attente</h3>
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-orange-600 mb-2">{totalPendingOrders}</p>
          <p className="text-sm text-gray-500">À traiter</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Taux de conversion</h3>
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-purple-600 mb-2">
            {totalCompanyOrders + totalPendingOrders > 0
              ? ((totalCompanyOrders / (totalCompanyOrders + totalPendingOrders)) * 100).toFixed(1)
              : '0.0'}%
          </p>
          <p className="text-sm text-gray-500">Commandes complétées</p>
        </div>
      </div>

      {/* Revenue Trends Chart */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          Tendances des revenus (30 derniers jours)
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} dh`, 'Revenus']} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch Performance */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-600" />
            Performance des succursales
          </h2>
          <div className="space-y-3">
            {branches.map((stat) => {
              const currentRev = getCurrentRevenue(stat);
              const prevRev = stat.previousPeriodRevenue;
              const changePercent = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : 0;

              return (
                <button
                  key={stat.branch.id}
                  onClick={() => setSelectedBranch(stat.branch.id)}
                  className={`w-full text-left p-4 rounded-lg transition-all ${
                    selectedBranch === stat.branch.id
                      ? 'bg-brand-50 border border-brand-500'
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{stat.branch.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        changePercent >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-500">{stat.branch.location}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Revenu</p>
                      <p className="font-bold text-brand-600">
                        {currentRev.toFixed(2)} dh
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Commandes</p>
                      <p className="font-bold text-gray-900">{getCurrentOrders(stat)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">En attente</p>
                      <p className="font-bold text-orange-600">{stat.pendingOrders}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Sales */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            Ventes par catégorie
          </h2>
          <div className="space-y-3">
            {categorySales.slice(0, 8).map((cat, index) => (
              <div key={cat.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: `hsl(${index * 45}, 70%, 50%)` }} />
                  <span className="font-medium text-gray-900">{cat.category}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-600">{cat.revenue.toFixed(2)} dh</p>
                  <p className="text-xs text-gray-500">{cat.orders} commandes</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Branch Stats */}
        {selectedStats && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-600" />
              {selectedStats.branch.name} - Détails
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-brand-50 to-brand-100 p-4 rounded-lg">
                <p className="text-sm text-brand-700 font-medium">Revenu {timeRange}</p>
                <p className="text-2xl md:text-3xl font-bold text-brand-600 mt-1">
                  {getCurrentRevenue(selectedStats).toFixed(2)} dh
                </p>
                {selectedStats.previousPeriodRevenue > 0 && (
                  <p className="text-xs text-brand-600 mt-1">
                    vs {selectedStats.previousPeriodRevenue.toFixed(2)} dh précédemment
                  </p>
                )}
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">Commandes {timeRange}</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-1">{getCurrentOrders(selectedStats)}</p>
                {selectedStats.previousPeriodOrders > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    vs {selectedStats.previousPeriodOrders} précédemment
                  </p>
                )}
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
                <p className="text-sm text-orange-700 font-medium">Commandes en attente</p>
                <p className="text-2xl md:text-3xl font-bold text-orange-600 mt-1">{selectedStats.pendingOrders}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg">
                <p className="text-sm text-slate-700 font-medium">Revenu total historique</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-600 mt-1">
                  {selectedStats.totalRevenue.toFixed(2)} dh
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Menu Management Section */}
      {showMenuManagement && (
        <div ref={menuManagementRef} className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Menu className="w-5 h-5 text-gray-600" />
            Gestion des menus
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Categories Management */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Catégories</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {allCategories.map((category) => (
                  <div key={category.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{category.name}</h4>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditCategoryModal(category)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Modifier"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">Ordre: {category.sort_order || 0}</p>
                  </div>
                ))}
                <button
                  onClick={openCreateCategoryModal}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une catégorie
                </button>
              </div>
            </div>

            {/* Menus List */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Menus disponibles</h3>
              <div className="space-y-3">
                {menus.map((menu) => (
                  <div key={menu.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{menu.name}</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditMenuModal(menu)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMenu(menu.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{menu.description || 'Aucune description'}</p>
                  </div>
                ))}
                <button
                  onClick={openCreateMenuModal}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Créer un nouveau menu
                </button>
              </div>
            </div>

            {/* Products Management */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Gestion des produits</h3>
                <button
                  onClick={openCreateProductModal}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un produit
                </button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {allProducts.map((product) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-xs">🍔</div>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 text-sm">{product.name}</h4>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditProductModal(product)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Modifier"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>Prix: {product.price} dh</p>
                      <p>Catégorie: {allCategories.find(c => c.id === product.category_id)?.name || 'N/A'}</p>
                      <p className={`inline-block px-2 py-1 rounded text-xs ${product.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {product.available ? 'Disponible' : 'Indisponible'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Branch Menu Assignment */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignation des menus aux succursales</h3>
              <div className="space-y-3">
                {branches.map((stat) => (
                  <div key={stat.branch.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{stat.branch.name}</h4>
                      <span className="text-xs text-gray-500">{stat.branch.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Menu:</label>
                      <select
                        value={stat.branch.menu_id || ''}
                        onChange={async (e) => {
                          const success = await assignMenuToBranch(stat.branch.id, e.target.value);
                          if (!success) {
                            alert('Erreur lors de l\'assignation du menu');
                          }
                        }}
                        className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Sélectionner un menu</option>
                        {menus.map((menu) => (
                          <option key={menu.id} value={menu.id}>
                            {menu.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingMenu ? 'Modifier le menu' : 'Créer un nouveau menu'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du menu *
                </label>
                <input
                  type="text"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Entrez le nom du menu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={menuDescription}
                  onChange={(e) => setMenuDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Entrez une description (optionnel)"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégories incluses
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md">
                  {allCategories.map((category) => (
                    <label key={category.id} className="flex items-center p-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategories([...selectedCategories, category.id]);
                          } else {
                            setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowMenuModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={saveMenu}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
              >
                {editingMenu ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du produit *
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Entrez le nom du produit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Entrez une description (optionnel)"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix (dh) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image du produit
                </label>

                {/* Tab selector */}
                <div className="flex border-b border-gray-200 mb-4">
                  <button
                    type="button"
                    onClick={() => setImageSource('library')}
                    className={`px-4 py-2 text-sm font-medium ${
                      imageSource === 'library'
                        ? 'border-b-2 border-brand-500 text-brand-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Bibliothèque
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSource('url')}
                    className={`px-4 py-2 text-sm font-medium ${
                      imageSource === 'url'
                        ? 'border-b-2 border-brand-500 text-brand-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    URL personnalisée
                  </button>
                </div>

                {imageSource === 'library' ? (
                  <div>
                    <p className="text-xs text-gray-600 mb-2">
                      Cliquez sur une image pour la sélectionner
                    </p>
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
                      {libraryImages.map((imageName) => (
                        <button
                          key={imageName}
                          type="button"
                          onClick={() => setProductImageUrl(`/products/library/${imageName}`)}
                          className={`relative border-2 rounded-md overflow-hidden hover:border-brand-500 transition-colors ${
                            productImageUrl === `/products/library/${imageName}`
                              ? 'border-brand-500 ring-2 ring-brand-200'
                              : 'border-gray-200'
                          }`}
                        >
                          <img
                            src={`/products/library/${imageName}`}
                            alt={imageName}
                            className="w-full h-16 object-cover"
                            onError={(e) => {
                              // Hide broken images
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      value={productImageUrl}
                      onChange={(e) => setProductImageUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="https://example.com/image.jpg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Entrez l'URL d'une image personnalisée
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie *
                </label>
                <div className="flex gap-2">
                  <select
                    value={productCategoryId}
                    onChange={(e) => setProductCategoryId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {allCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductModal(false);
                      setTimeout(() => openCreateCategoryModal(), 100);
                    }}
                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                    title="Créer une nouvelle catégorie"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Cliquez sur + pour créer une nouvelle catégorie
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordre d'affichage
                </label>
                <input
                  type="number"
                  min="0"
                  value={productSortOrder}
                  onChange={(e) => setProductSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={productAvailable}
                    onChange={(e) => setProductAvailable(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Disponible</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowProductModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={saveProduct}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
              >
                {editingProduct ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingCategory ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la catégorie *
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Entrez le nom de la catégorie"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de l'image de la catégorie
                </label>
                <input
                  type="url"
                  value={categoryImageUrl}
                  onChange={(e) => setCategoryImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Entrez l'URL d'une image pour cette catégorie
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordre d'affichage
                </label>
                <input
                  type="number"
                  min="0"
                  value={categorySortOrder}
                  onChange={(e) => setCategorySortOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={saveCategory}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
              >
                {editingCategory ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version Footer */}
      <div className="mt-8 text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
        {APP_NAME} - Version {APP_VERSION}
      </div>
    </div>
  );
}
