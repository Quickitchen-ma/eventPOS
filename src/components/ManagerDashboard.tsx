import { useEffect, useState } from 'react';
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Caisse enregistreuse Quickitchen</h1>
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
          onClick={() => setShowMenuManagement(!showMenuManagement)}
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
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-brand-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Revenu total</h3>
            <DollarSign className="w-6 h-6 text-brand-600" />
          </div>
          <p className="text-3xl font-bold text-brand-600 mb-2">
            {totalCompanyRevenue.toFixed(2)} dh
          </p>
          <p className="text-sm text-gray-500">{totalCompanyOrders} commandes</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Revenu moyen</h3>
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-2">
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
          <p className="text-3xl font-bold text-orange-600 mb-2">{totalPendingOrders}</p>
          <p className="text-sm text-gray-500">À traiter</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Taux de conversion</h3>
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-600 mb-2">
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
                <p className="text-3xl font-bold text-brand-600 mt-1">
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
                <p className="text-3xl font-bold text-blue-600 mt-1">{getCurrentOrders(selectedStats)}</p>
                {selectedStats.previousPeriodOrders > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    vs {selectedStats.previousPeriodOrders} précédemment
                  </p>
                )}
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
                <p className="text-sm text-orange-700 font-medium">Commandes en attente</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{selectedStats.pendingOrders}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg">
                <p className="text-sm text-slate-700 font-medium">Revenu total historique</p>
                <p className="text-3xl font-bold text-slate-600 mt-1">
                  {selectedStats.totalRevenue.toFixed(2)} dh
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Menu Management Section */}
      {showMenuManagement && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Menu className="w-5 h-5 text-gray-600" />
            Gestion des menus
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Gestion des produits</h3>
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
                <button
                  onClick={openCreateProductModal}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un produit
                </button>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de l'image du produit
                </label>
                <input
                  type="url"
                  value={productImageUrl}
                  onChange={(e) => setProductImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Entrez l'URL d'une image pour ce produit
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie *
                </label>
                <select
                  value={productCategoryId}
                  onChange={(e) => setProductCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {allCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
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
