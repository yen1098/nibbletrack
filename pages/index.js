import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// --- PASTE YOUR SUPABASE KEYS HERE ---
const supabaseUrl = 'https://trlwqrejwtiypgkbciqu.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybHdxcmVqd3RpeXBna2JjaXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4Mjk3NTgsImV4cCI6MjEwMDQwNTc1OH0.yAWg9aw9JtWpo-4SkbXpD-UlQ_0xCuJWrJTSJHPMG4o';
const supabase = createClient(supabaseUrl, supabaseKey);

const parseRange = (str) => {
  if (!str || typeof str !== 'string') return [0, 0];
  const cleanStr = str.replace(/,/g, '');
  if (cleanStr.includes('-')) {
    const parts = cleanStr.split('-').map(s => parseInt(s.trim()) || 0);
    return [parts[0], parts[1] || parts[0]];
  }
  const num = parseInt(cleanStr) || 0;
  return [num, num];
};

const themes = {
  rose: { name: 'Rose', 50: '#fff1f5', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48' },
  blue: { name: 'Blue', 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb' },
  green: { name: 'Green', 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a' },
  purple: { name: 'Purple', 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea' },
  orange: { name: 'Orange', 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c' }
};

const generateThemeCSS = (themeKey) => {
  const c = themes[themeKey] || themes.rose;
  return `
    .bg-rose-50 { background-color: ${c[50]} !important; }
    .bg-rose-100 { background-color: ${c[100]} !important; }
    .bg-rose-200 { background-color: ${c[200]} !important; }
    .bg-rose-500 { background-color: ${c[500]} !important; }
    .hover\\:bg-rose-600:hover { background-color: ${c[600]} !important; }
    .hover\\:bg-rose-200:hover { background-color: ${c[200]} !important; }
    .text-rose-400 { color: ${c[400]} !important; }
    .text-rose-500 { color: ${c[500]} !important; }
    .text-rose-600 { color: ${c[600]} !important; }
    .hover\\:text-rose-600:hover { color: ${c[600]} !important; }
    .border-rose-100 { border-color: ${c[100]} !important; }
    .border-rose-200 { border-color: ${c[200]} !important; }
    .border-rose-500 { border-color: ${c[500]} !important; }
    .focus\\:ring-rose-300:focus { --tw-ring-color: ${c[300]} !important; }
    .ring-rose-300 { --tw-ring-color: ${c[300]} !important; }
    .shadow-rose-100 { --tw-shadow-color: ${c[100]} !important; }
    .shadow-rose-200 { --tw-shadow-color: ${c[200]} !important; }
  `;
};

const renderRecipeDetails = (details) => {
  if (!details) return null;
  return details.split('\n').map((line, index) => {
    if (line.trim().startsWith('- [ ]')) {
      const text = line.replace('- [ ]', '').trim();
      return (
        <div key={index} className="flex items-center gap-2 my-1">
          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-rose-500 focus:ring-rose-400" />
          <span className="text-sm text-gray-600">{text}</span>
        </div>
      );
    }
    return <div key={index} className="text-sm text-gray-600">{line}</div>;
  });
};

export default function Home() {
  const [session, setSession] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [todaysMeals, setTodaysMeals] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [savedMeals, setSavedMeals] = useState([]);
  const [recentMeals, setRecentMeals] = useState([]);
  const [myRecipes, setMyRecipes] = useState([]);
  const [publicRecipes, setPublicRecipes] = useState([]);
  const [goals, setGoals] = useState({ calories_goal: 1200, protein_goal: 90, fiber_goal: 30, added_sugar_goal: 25, sodium_goal: 2000 });
  
  const [activeTab, setActiveTab] = useState('tracker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [settingCal, setSettingCal] = useState(1200);
  const [settingPro, setSettingPro] = useState(90);
  const [settingFib, setSettingFib] = useState(30);
  const [settingAs, setSettingAs] = useState(25);
  const [settingSod, setSettingSod] = useState(2000);

  const [recipeName, setRecipeName] = useState('');
  const [rawRecipeInput, setRawRecipeInput] = useState('');
  const [finalRecipeDetails, setFinalRecipeDetails] = useState('');
  const [formattingRecipe, setFormattingRecipe] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeSubTab, setRecipeSubTab] = useState('mine');
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [editingRecipeText, setEditingRecipeText] = useState('');

  const [mealToDelete, setMealToDelete] = useState(null);
  const [savedMealToDelete, setSavedMealToDelete] = useState(null);
  const [editingSavedMealId, setEditingSavedMealId] = useState(null);
  const [editingSavedMealName, setEditingSavedMealName] = useState('');
  
  const [themeColor, setThemeColor] = useState('rose');

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatThinking, setChatThinking] = useState(false);
  const [showSavedWidget, setShowSavedWidget] = useState(false);
  const [showRecentWidget, setShowRecentWidget] = useState(false);
  const chatScrollRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
      else fetchPublicRecipes();
      setIsLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setIsGuest(false);
        fetchUserData(session.user.id);
      } else {
        fetchPublicRecipes();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatThinking]);

  const fetchUserData = async (userId) => {
    fetchMeals(userId);
    fetchHistory(userId);
    fetchSavedMeals(userId);
    fetchRecentMeals(userId);
    fetchMyRecipes(userId);
    fetchGoals(userId);
    fetchPublicRecipes();
  };

  const fetchMeals = async (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('meals').select('*').eq('user_id', userId).gte('created_at', today);
    if (data) setTodaysMeals(data);
  };

  const fetchRecentMeals = async (userId) => {
    const { data } = await supabase.from('meals').select('description').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
    if (data) {
      const unique = [...new Set(data.map(m => m.description))].map(desc => ({ description: desc }));
      setRecentMeals(unique);
    }
  };

  const fetchHistory = async (userId) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data } = await supabase.from('meals').select('*').eq('user_id', userId).gte('created_at', sevenDaysAgo.toISOString());
    if (data) {
      const grouped = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        grouped[dateStr] = { date: d.toLocaleDateString('en-US', { weekday: 'short' }), calories: 0, protein: 0, fiber: 0, sodium: 0, added_sugar: 0, total_sugar: 0 };
      }
      data.forEach(meal => {
        const dateStr = new Date(meal.created_at).toISOString().split('T')[0];
        if (grouped[dateStr]) {
          grouped[dateStr].calories += parseRange(meal.calories)[1];
          grouped[dateStr].protein += parseRange(meal.protein)[1];
          grouped[dateStr].fiber += parseRange(meal.fiber)[1];
          grouped[dateStr].sodium += parseRange(meal.sodium)[1];
          grouped[dateStr].added_sugar += parseRange(meal.added_sugar)[1];
          grouped[dateStr].total_sugar += parseRange(meal.total_sugar)[1];
        }
      });
      setHistoryData(Object.values(grouped));
    }
  };

  const fetchSavedMeals = async (userId) => {
    const { data } = await supabase.from('saved_meals').select('id, name').eq('user_id', userId);
    if (data) setSavedMeals(data);
  };

  const fetchMyRecipes = async (userId) => {
    const { data } = await supabase.from('recipes').select('*').eq('user_id', userId);
    if (data) setMyRecipes(data);
  };

  const fetchPublicRecipes = async () => {
    const { data } = await supabase.from('recipes').select('*').eq('is_public', true);
    if (data) setPublicRecipes(data);
  };

  const fetchGoals = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setGoals(data);
      setSettingCal(data.calories_goal);
      setSettingPro(data.protein_goal);
      setSettingFib(data.fiber_goal);
      setSettingAs(data.added_sugar_goal);
      setSettingSod(data.sodium_goal);
      if (data.theme_color) setThemeColor(data.theme_color);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Check your email for the confirmation link!");
  };

  const handleLogout = async () => {
    if (isGuest) {
      setIsGuest(false);
      setActiveTab('tracker');
    } else {
      await supabase.auth.signOut();
      setTodaysMeals([]);
      setMyRecipes([]);
    }
  };

  const enterGuestMode = () => {
    setIsGuest(true);
    setActiveTab('recipes');
    setRecipeSubTab('discover');
  };

  // Chat Logic
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { text: chatInput, role: 'user', id: Date.now() };
    const history = chatMessages.map(m => ({ text: m.text, role: m.role === 'user' ? 'user' : 'model' }));
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatThinking(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput, history })
      });
      const data = await res.json();
      
      if (data.reply) {
        // The API returns a JSON string, so we parse it
        const parsed = JSON.parse(data.reply);
        
        if (parsed.type === 'food_suggestion') {
          setChatMessages(prev => [...prev, { 
            type: 'food_suggestion', 
            text: parsed.text, 
            meal: parsed.meal, 
            role: 'assistant', 
            id: Date.now(),
            logged: false
          }]);
        } else {
          setChatMessages(prev => [...prev, { 
            type: 'chat', 
            text: parsed.text, 
            role: 'assistant', 
            id: Date.now() 
          }]);
        }
      } else {
        alert(data.error || "Chat error");
      }
    } catch (e) {
      alert("Failed to get response");
    } finally {
      setChatThinking(false);
    }
  };

  // Add meal from Chat Card
  const addMealFromChat = async (mealData, msgId) => {
    const { data, error } = await supabase.from('meals').insert([
      { user_id: session.user.id, ...mealData }
    ]).select().single();
    
    if (data) {
      setTodaysMeals(prev => [...prev, data]);
      fetchHistory(session.user.id);
      fetchRecentMeals(session.user.id);
      // Update chat message to show it was logged
      setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, logged: true } : m));
    } else {
      alert("Error logging meal");
    }
  };

  const requestDelete = (id) => setMealToDelete(id);
  const cancelDelete = () => setMealToDelete(null);
  const confirmDelete = async () => {
    await supabase.from('meals').delete().eq('id', mealToDelete);
    setTodaysMeals(todaysMeals.filter(m => m.id !== mealToDelete));
    setMealToDelete(null);
    fetchHistory(session.user.id);
  };

  const startEditSavedMeal = (m) => {
    setEditingSavedMealId(m.id);
    setEditingSavedMealName(m.name);
  };

  const saveEditedSavedMeal = async (id) => {
    const { data, error } = await supabase.from('saved_meals').update({ name: editingSavedMealName }).eq('id', id).select().single();
    if (data) setSavedMeals(savedMeals.map(m => m.id === id ? data : m));
    setEditingSavedMealId(null);
  };

  const requestDeleteSavedMeal = (id) => setSavedMealToDelete(id);
  const cancelDeleteSavedMeal = () => setSavedMealToDelete(null);
  const confirmDeleteSavedMeal = async () => {
    await supabase.from('saved_meals').delete().eq('id', savedMealToDelete);
    setSavedMeals(savedMeals.filter(m => m.id !== savedMealToDelete));
    setSavedMealToDelete(null);
  };

  const saveGoals = async () => {
    const { error } = await supabase.from('profiles').update({
      calories_goal: settingCal, protein_goal: settingPro, fiber_goal: settingFib, added_sugar_goal: settingAs, sodium_goal: settingSod
    }).eq('id', session.user.id);
    if (error) alert(error.message);
    else { fetchGoals(session.user.id); alert("Goals saved!"); }
  };

  const changeTheme = async (color) => {
    setThemeColor(color);
    if (session) await supabase.from('profiles').update({ theme_color: color }).eq('id', session.user.id);
  };

  const formatRecipeWithAI = async () => {
    if (!rawRecipeInput) return alert("Please paste some raw text first.");
    setFormattingRecipe(true);
    try {
      const response = await fetch('/api/format-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawRecipeInput })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setFinalRecipeDetails(data.formattedText);
    } catch (error) {
      alert("Error formatting recipe: " + error.message);
    } finally {
      setFormattingRecipe(false);
    }
  };

  const saveRecipe = async () => {
    if (!recipeName) return alert("Please enter a recipe name.");
    if (!finalRecipeDetails) return alert("Please format or enter the recipe details.");

    const { data, error } = await supabase.from('recipes').insert([
      { user_id: session.user.id, name: recipeName, details: finalRecipeDetails }
    ]).select().single();
    if (error) return alert(error.message);
    
    setMyRecipes([...myRecipes, data]);
    
    if (!savedMeals.some(m => m.name === recipeName)) {
      const { data: savedMealData } = await supabase.from('saved_meals').insert([{ user_id: session.user.id, name: recipeName }]).select().single();
      if (savedMealData) setSavedMeals([...savedMeals, savedMealData]);
    }

    setRecipeName('');
    setRawRecipeInput('');
    setFinalRecipeDetails('');
  };

  const toggleRecipePublic = async (recipe) => {
    const newPublicState = !recipe.is_public;
    const { data, error } = await supabase.from('recipes').update({ is_public: newPublicState }).eq('id', recipe.id).select().single();
    if (data) {
      setMyRecipes(myRecipes.map(r => r.id === recipe.id ? data : r));
      fetchPublicRecipes();
    }
  };

  const deleteRecipe = async (id) => {
    await supabase.from('recipes').delete().eq('id', id);
    setMyRecipes(myRecipes.filter(r => r.id !== id));
  };

  const startEditRecipe = (r) => {
    setEditingRecipeId(r.id);
    setEditingRecipeText(r.details);
  };

  const saveEditedRecipe = async (id) => {
    const { data, error } = await supabase.from('recipes').update({ details: editingRecipeText }).eq('id', id).select().single();
    if (data) setMyRecipes(myRecipes.map(r => r.id === id ? data : r));
    setEditingRecipeId(null);
  };

  const totals = todaysMeals.reduce((acc, meal) => {
    const cal = parseRange(meal.calories), pro = parseRange(meal.protein), fib = parseRange(meal.fiber), ts = parseRange(meal.total_sugar), as = parseRange(meal.added_sugar), sod = parseRange(meal.sodium);
    acc.caloriesMin += cal[0]; acc.caloriesMax += cal[1];
    acc.proteinMin += pro[0]; acc.proteinMax += pro[1];
    acc.fiberMin += fib[0]; acc.fiberMax += fib[1];
    acc.totalSugarMin += ts[0]; acc.totalSugarMax += ts[1];
    acc.addedSugarMin += as[0]; acc.addedSugarMax += as[1];
    acc.sodiumMin += sod[0]; acc.sodiumMax += sod[1];
    return acc;
  }, { caloriesMin: 0, caloriesMax: 0, proteinMin: 0, proteinMax: 0, fiberMin: 0, fiberMax: 0, totalSugarMin: 0, totalSugarMax: 0, addedSugarMin: 0, addedSugarMax: 0, sodiumMin: 0, sodiumMax: 0 });

  const Logo = ({ className }) => (
    <img src="/apple-touch-icon.png" className={className} alt="NibbleTrack Logo" style={{ borderRadius: '20%' }} />
  );

  // --- LOADING SCREEN ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 font-sans">
        <Head>
          <title>NibbleTrack</title>
          <link rel="icon" href="/favicon.png" type="image/png" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
          <script src="https://cdn.tailwindcss.com"></script>
        </Head>
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Logo className="h-12 w-12" />
          <h1 className="text-2xl font-bold text-rose-500 tracking-tight">NibbleTrack</h1>
        </div>
      </div>
    );
  }

  // --- LOGIN SCREEN ---
  if (!session && !isGuest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 p-4 font-sans">
        <Head>
          <title>NibbleTrack</title>
          <link rel="icon" href="/favicon.png" type="image/png" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>{`html, body { -webkit-overflow-scrolling: touch; overscroll-behavior-y: none; -webkit-tap-highlight-color: transparent; }`}</style>
        </Head>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-rose-100 max-w-md w-full">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Logo className="h-8 w-8" />
            <h1 className="text-3xl font-bold text-rose-500 tracking-tight">NibbleTrack</h1>
          </div>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-3 border border-rose-200 rounded-xl bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-300 text-base" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-4 border border-rose-200 rounded-xl bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-300 text-base" />
          <button onClick={handleLogin} className="w-full bg-rose-500 text-white py-3 rounded-xl mb-2 font-semibold hover:bg-rose-600 transition">Log In</button>
          <button onClick={handleSignUp} className="w-full bg-white text-rose-500 border border-rose-200 py-3 rounded-xl font-semibold hover:bg-rose-50 transition mb-4">Sign Up</button>
          <div className="text-center text-xs text-gray-400 mb-2">— OR —</div>
          <button onClick={enterGuestMode} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition">View Shared Recipes</button>
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-rose-50 pb-24 font-sans" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      <Head>
        <title>NibbleTrack</title>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>{`
          html, body { -webkit-overflow-scrolling: touch; overscroll-behavior-y: none; -webkit-tap-highlight-color: transparent; }
          ${generateThemeCSS(themeColor)}
        `}</style>
      </Head>

      <header className="max-w-6xl mx-auto p-4 sm:p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <h1 className="text-2xl font-bold text-rose-500 tracking-tight">NibbleTrack</h1>
        </div>
        <button onClick={handleLogout} className="text-xs text-rose-400 hover:underline">
          {isGuest ? 'Log In' : 'Log Out'}
        </button>
      </header>

      {/* ================= TRACKER VIEW ================= */}
      {activeTab === 'tracker' && !isGuest && (
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 flex flex-col items-center justify-center text-center">
              <Logo className="h-10 w-10 mb-3" />
              <h2 className="text-xl font-semibold mb-2 text-gray-700">Log a Meal with NibbleBot</h2>
              <p className="text-sm text-gray-500 mb-4">Tap the chat button below to tell NibbleBot what you ate, or use quick widgets for saved meals.</p>
              <button onClick={() => setShowChat(true)} className="bg-rose-500 text-white font-semibold py-3 px-6 rounded-xl hover:bg-rose-600 transition">
                Open Chat
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Today's Log</h2>
              <div className="space-y-3">
                {todaysMeals.length === 0 && <div className="flex items-center justify-center gap-2 text-rose-300 text-sm py-4"><Logo className="h-5 w-5" /> No meals logged yet.</div>}
                {todaysMeals.map(meal => (
                  <div key={meal.id} className="flex justify-between items-start p-3 border border-rose-100 rounded-xl bg-white">
                    <div className="mr-2">
                      <p className="font-medium capitalize text-gray-700">{meal.description}</p>
                      <p className="text-xs text-rose-400 mt-1">P: {meal.protein}g | Fib: {meal.fiber}g | Sod: {meal.sodium}mg</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="font-bold text-rose-500 whitespace-nowrap">{meal.calories} kcal</div>
                      <button onClick={() => setMealToDelete(meal.id)} className="text-rose-300 hover:text-red-500 text-xs mt-1">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Today's Metrics</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1"><span className="text-gray-600">Calories</span><span className="text-gray-800">{totals.caloriesMin}-{totals.caloriesMax} / {goals.calories_goal} kcal</span></div>
                  <div className="w-full bg-rose-100 rounded-full h-2.5"><div className="bg-rose-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totals.caloriesMax / goals.calories_goal) * 100)}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1"><span className="text-gray-600">Protein</span><span className="text-gray-800">{totals.proteinMin}-{totals.proteinMax} / {goals.protein_goal} g</span></div>
                  <div className="w-full bg-green-100 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totals.proteinMax / goals.protein_goal) * 100)}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1"><span className="text-gray-600">Fiber</span><span className="text-gray-800">{totals.fiberMin}-{totals.fiberMax} / {goals.fiber_goal} g</span></div>
                  <div className="w-full bg-blue-100 rounded-full h-2.5"><div className="bg-blue-400 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totals.fiberMax / goals.fiber_goal) * 100)}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1"><span className="text-gray-600">Sodium</span><span className="text-gray-800">{totals.sodiumMin}-{totals.sodiumMax} / ≤ {goals.sodium_goal} mg</span></div>
                  <div className="w-full bg-purple-100 rounded-full h-2.5"><div className="bg-purple-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totals.sodiumMax / goals.sodium_goal) * 100)}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1"><span className="text-gray-600">Added Sugar</span><span className="text-gray-800">{totals.addedSugarMin}-{totals.addedSugarMax} / ≤ {goals.added_sugar_goal} g</span></div>
                  <div className="w-full bg-yellow-100 rounded-full h-2.5"><div className="bg-yellow-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totals.addedSugarMax / goals.added_sugar_goal) * 100)}%` }}></div></div>
                </div>
                <div className="flex justify-between text-sm font-medium pt-2 border-t border-rose-50 mt-2">
                  <span className="text-gray-600">Total Sugar</span>
                  <span className="text-gray-800">{totals.totalSugarMin}-{totals.totalSugarMax} g <span className="text-gray-400 ml-1">(No limit)</span></span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-700">History (7 Days)</h2>
                <span className="text-xs text-rose-400 font-medium">Scroll for charts &rarr;</span>
              </div>
              <div className="flex overflow-x-auto custom-scroll pb-4" style={{ scrollSnapType: 'x mandatory' }}>
                <div className="pr-3" style={{ scrollSnapAlign: 'start', flex: '0 0 100%', width: '100%' }}>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scroll pr-2">
                    {historyData.slice().reverse().map((day, index) => (
                      <details key={index} className="bg-white rounded-xl border border-rose-100">
                        <summary className="p-3 font-medium cursor-pointer flex justify-between items-center list-none">
                          <span className="text-gray-700">{day.date}</span>
                          <span className="font-bold text-rose-500 text-sm">{day.calories} kcal</span>
                        </summary>
                        <div className="px-3 pb-3 text-xs text-gray-600 grid grid-cols-2 gap-2 border-t border-rose-100 pt-3 mt-1">
                          <div>Protein: <span className="font-bold">{day.protein}g</span></div>
                          <div>Fiber: <span className="font-bold">{day.fiber}g</span></div>
                          <div>Total Sugar: <span className="font-bold">{day.total_sugar}g</span></div>
                          <div className={day.added_sugar > goals.added_sugar_goal ? 'text-red-600 font-bold' : ''}>Added Sugar: {day.added_sugar}g</div>
                          <div className={day.sodium > goals.sodium_goal ? 'text-red-600 font-bold' : ''}>Sodium: {day.sodium}mg</div>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
                {[
                  { title: 'Calories', key: 'calories', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)' },
                  { title: 'Protein', key: 'protein', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
                  { title: 'Fiber', key: 'fiber', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)' },
                  { title: 'Sodium', key: 'sodium', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
                  { title: 'Added Sugar', key: 'added_sugar', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
                  { title: 'Total Sugar', key: 'total_sugar', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' }
                ].map(chart => (
                  <div key={chart.key} className="pr-3" style={{ scrollSnapAlign: 'start', flex: '0 0 100%', width: '100%' }}>
                    <h3 className="text-sm font-semibold text-rose-400 mb-2">{chart.title} Trend</h3>
                    <div className="h-[220px]"><HistoryChart data={historyData} dataKey={chart.key} color={chart.color} bg={chart.bg} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= RECIPES VIEW ================= */}
      {activeTab === 'recipes' && (
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {session && recipeSubTab === 'mine' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 h-fit overflow-hidden">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Add Healthy Recipe</h2>
              <input type="text" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} className="w-full p-3 mb-4 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-300 focus:outline-none bg-rose-50/30 box-border text-base" placeholder="Recipe Name (e.g., Sugar-free Cookies)" />
              
              <label className="text-xs font-medium text-rose-400 uppercase tracking-wider block mb-2">Raw Ingredients (Paste here)</label>
              <textarea value={rawRecipeInput} onChange={(e) => setRawRecipeInput(e.target.value)} className="w-full p-3 border border-rose-200 rounded-xl mb-2 focus:ring-2 focus:ring-rose-300 focus:outline-none bg-rose-50/30 box-border text-base" rows="3" placeholder="e.g., 2 cups flour 1 cup sugar 2 eggs mix and bake at 350..."></textarea>
              <button onClick={formatRecipeWithAI} disabled={formattingRecipe} className="w-full bg-blue-500 text-white font-semibold py-2 rounded-xl mb-4 disabled:opacity-50 hover:bg-blue-600 transition">
                {formattingRecipe ? 'Formatting...' : 'Format with AI ✨'}
              </button>

              <label className="text-xs font-medium text-rose-400 uppercase tracking-wider block mb-2">Final Recipe Details</label>
              <textarea value={finalRecipeDetails} onChange={(e) => setFinalRecipeDetails(e.target.value)} className="w-full p-3 border border-rose-200 rounded-xl mb-4 focus:ring-2 focus:ring-rose-300 focus:outline-none bg-rose-50/30 box-border text-base" rows="4" placeholder="AI will format this, or type it manually..."></textarea>
              <button onClick={saveRecipe} className="w-full bg-green-500 text-white font-semibold py-3 rounded-xl hover:bg-green-600 transition shadow-sm shadow-green-200 box-border">Save Recipe</button>
            </div>
          )}

          <div className={`${session && recipeSubTab === 'mine' ? '' : 'md:col-span-2'} bg-white p-6 rounded-2xl shadow-sm border border-rose-100 overflow-hidden`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">Recipes</h2>
            </div>
            
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={recipeSearch} 
                onChange={(e) => setRecipeSearch(e.target.value)} 
                className="flex-1 p-2.5 border border-rose-200 rounded-xl text-base focus:outline-none bg-rose-50/30" 
                placeholder="Search recipes..." 
              />
            </div>

            {session && (
              <div className="flex border-b border-rose-100 mb-4">
                <button onClick={() => setRecipeSubTab('mine')} className={`flex-1 py-2 text-sm font-medium ${recipeSubTab === 'mine' ? 'text-rose-600 border-b-2 border-rose-500' : 'text-gray-400'}`}>My Recipes</button>
                <button onClick={() => setRecipeSubTab('discover')} className={`flex-1 py-2 text-sm font-medium ${recipeSubTab === 'discover' ? 'text-rose-600 border-b-2 border-rose-500' : 'text-gray-400'}`}>Discover</button>
              </div>
            )}

            <div className="space-y-3">
              {recipeSubTab === 'mine' && session && myRecipes
                .filter(r => r.name.toLowerCase().includes(recipeSearch.toLowerCase()) || r.details.toLowerCase().includes(recipeSearch.toLowerCase()))
                .map(r => (
                <div key={r.id} className="p-4 border border-rose-100 rounded-xl bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800">{r.name}</h3>
                    <button onClick={() => toggleRecipePublic(r)} className={`text-xs px-2 py-1 rounded-full ${r.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {r.is_public ? 'Public' : 'Private'}
                    </button>
                  </div>
                  {editingRecipeId === r.id ? (
                    <>
                      <textarea value={editingRecipeText} onChange={(e) => setEditingRecipeText(e.target.value)} className="w-full p-2 border border-rose-200 rounded-lg text-sm mb-2" rows="4" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEditedRecipe(r.id)} className="text-xs text-green-600 font-medium">Save</button>
                        <button onClick={() => setEditingRecipeId(null)} className="text-xs text-gray-500 font-medium">Cancel</button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-1">{renderRecipeDetails(r.details)}</div>
                  )}
                  {editingRecipeId !== r.id && (
                    <div className="flex gap-3 mt-3 border-t border-rose-50 pt-3">
                      <button onClick={() => startEditRecipe(r)} className="text-xs text-rose-400 hover:text-rose-600 font-medium">Edit</button>
                      <button onClick={() => deleteRecipe(r.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">Delete</button>
                    </div>
                  )}
                </div>
              ))}

              {recipeSubTab === 'discover' && publicRecipes
                .filter(r => r.name.toLowerCase().includes(recipeSearch.toLowerCase()) || r.details.toLowerCase().includes(recipeSearch.toLowerCase()))
                .map(r => (
                <div key={r.id} className="p-4 border border-rose-100 rounded-xl bg-rose-50/30">
                  <h3 className="font-semibold text-gray-800">{r.name}</h3>
                  <div className="mt-1">{renderRecipeDetails(r.details)}</div>
                </div>
              ))}
              
              {recipeSubTab === 'mine' && myRecipes.filter(r => r.name.toLowerCase().includes(recipeSearch.toLowerCase()) || r.details.toLowerCase().includes(recipeSearch.toLowerCase())).length === 0 && (
                <div className="flex items-center justify-center gap-2 text-rose-300 text-sm py-4"><Logo className="h-5 w-5" /> No recipes found.</div>
              )}
              {recipeSubTab === 'discover' && publicRecipes.filter(r => r.name.toLowerCase().includes(recipeSearch.toLowerCase()) || r.details.toLowerCase().includes(recipeSearch.toLowerCase())).length === 0 && (
                <div className="flex items-center justify-center gap-2 text-rose-300 text-sm py-4"><Logo className="h-5 w-5" /> No public recipes found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= SETTINGS VIEW ================= */}
      {activeTab === 'settings' && session && (
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 mb-6 overflow-hidden">
            <h2 className="text-xl font-semibold mb-6 text-gray-700">Daily Goals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-rose-400 uppercase tracking-wider block mb-1">Calories (kcal)</label><input type="number" value={settingCal} onChange={(e) => setSettingCal(e.target.value)} className="w-full p-2.5 border border-rose-200 rounded-xl text-base focus:ring-2 focus:ring-rose-300 focus:outline-none bg-rose-50/30 box-border" /></div>
              <div><label className="text-xs font-medium text-rose-400 uppercase tracking-wider block mb-1">Protein (g)</label><input type="number" value={settingPro} onChange={(e) => setSettingPro(e.target.value)} className="w-full p-2.5 border border-rose-200 rounded-xl text-base focus:ring-2 focus:ring-rose-300 focus:outline-none bg-rose-50/30 box-border" /></div>
              <div><label className="text-xs font-medium text-rose-400 uppercase tracking-wider block mb-1">Fiber (g)</label><input type="number" value={settingFib} onChange={(e) => setSettingFib(e.target.value)} className="w-full p-2.5 border border-rose-200 rounded-xl text-base focus:ring-2 focus:ring-rose-300 focus:outline-none bg-rose-50/30 box-border" /></div>
              <div><label className="text-xs font-medium text-rose-400 uppercase tracking-wider block mb-1">Added Sugar (g)</label><input type="number" value={settingAs} onChange={(e) => setSettingAs(e.target.value)} className="w-full p-2.5 border border-rose-200 rounded-xl text-base focus:ring-2 focus:ring-rose-300 focus:outline-none bg-rose-50/30 box-border" /></div>
              <div><label className="text-xs font-medium text-rose-400 uppercase tracking-wider block mb-1">Sodium (mg)</label><input type="number" value={settingSod} onChange={(e) => setSettingSod(e.target.value)} className="w-full p-2.5 border border-rose-200 rounded-xl text-base focus:ring-2 focus:ring-rose-300 focus:outline-none bg-rose-50/30 box-border" /></div>
            </div>
            <button onClick={saveGoals} className="mt-6 w-full bg-rose-500 text-white font-semibold py-3 rounded-xl hover:bg-rose-600 transition shadow-sm shadow-rose-200 box-border">Save Goals</button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 mb-6 overflow-hidden">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">App Theme</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(themes).map(([key, val]) => (
                <button 
                  key={key} 
                  onClick={() => changeTheme(key)} 
                  className={`flex items-center gap-2 p-2 pr-4 rounded-xl border transition ${themeColor === key ? 'border-gray-800 bg-gray-50' : 'border-rose-100 hover:bg-gray-50'}`}
                >
                  <span className="w-6 h-6 rounded-full" style={{ backgroundColor: val[500] }}></span>
                  <span className="text-sm font-medium text-gray-700">{val.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Manage Saved Meals</h2>
            <div className="space-y-2">
              {savedMeals.length === 0 && <p className="text-rose-300 text-sm text-center py-4">No saved meals yet.</p>}
              {savedMeals.map(m => (
                <div key={m.id} className="flex justify-between items-center p-3 bg-rose-50/40 border border-rose-100 rounded-xl">
                  {editingSavedMealId === m.id ? (
                    <input type="text" value={editingSavedMealName} onChange={(e) => setEditingSavedMealName(e.target.value)} className="flex-1 min-w-0 p-2 border border-rose-200 rounded-lg text-base focus:outline-none" />
                  ) : (
                    <span className="text-sm text-gray-700 capitalize">{m.name}</span>
                  )}
                  <div className="flex gap-2 ml-2 flex-shrink-0">
                    {editingSavedMealId === m.id ? (
                      <button onClick={() => saveEditedSavedMeal(m.id)} className="text-xs text-green-600 hover:underline font-medium">Save</button>
                    ) : (
                      <button onClick={() => startEditSavedMeal(m)} className="text-xs text-rose-400 hover:text-rose-600 font-medium">Edit</button>
                    )}
                    <button onClick={() => setSavedMealToDelete(m.id)} className="text-xs text-rose-400 hover:text-red-500 font-medium">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mealToDelete && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4" onClick={cancelDelete}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Meal?</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this meal? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={cancelDelete} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      {savedMealToDelete && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4" onClick={cancelDeleteSavedMeal}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Saved Meal?</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this from your saved meals?</p>
            <div className="flex gap-3">
              <button onClick={cancelDeleteSavedMeal} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition">Cancel</button>
              <button onClick={confirmDeleteSavedMeal} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      <button 
        onClick={() => setShowChat(true)} 
        className="fixed bottom-24 right-5 z-40 bg-rose-500 text-white p-4 rounded-full shadow-lg shadow-rose-300 hover:bg-rose-600 transition flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      </button>

      {/* Chat Window Modal */}
      {showChat && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:p-4 bg-black/40" onClick={() => setShowChat(false)}>
          <div className="bg-white w-full sm:max-w-md h-[85vh] sm:h-[600px] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Logo className="h-6 w-6" />
                <h3 className="font-semibold text-gray-800">NibbleBot Chat</h3>
              </div>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-400 text-sm mt-10">
                  <Logo className="h-10 w-10 mx-auto mb-2" />
                  <p>Hi! Tell me what you ate, or ask me a nutrition question!</p>
                </div>
              )}
              
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-rose-500 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-700 rounded-bl-none'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    
                    {/* Render Food Suggestion Card */}
                    {msg.type === 'food_suggestion' && msg.meal && (
                      <div className="mt-3 bg-rose-50 p-3 rounded-xl border border-rose-100">
                        <p className="font-semibold text-gray-800 text-sm mb-2">{msg.meal.description}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                          <div>Calories: <span className="font-bold">{msg.meal.calories}</span></div>
                          <div>Protein: <span className="font-bold">{msg.meal.protein}g</span></div>
                          <div>Fiber: <span className="font-bold">{msg.meal.fiber}g</span></div>
                          <div>Sodium: <span className="font-bold">{msg.meal.sodium}mg</span></div>
                          <div>Total Sugar: <span className="font-bold">{msg.meal.total_sugar}g</span></div>
                          <div>Added Sugar: <span className="font-bold">{msg.meal.added_sugar}g</span></div>
                        </div>
                        {msg.logged ? (
                          <button disabled className="w-full bg-green-500 text-white py-2 rounded-lg text-xs font-semibold">
                            Added to Log ✓
                          </button>
                        ) : (
                          <button 
                            onClick={() => addMealFromChat(msg.meal, msg.id)} 
                            className="w-full bg-rose-500 text-white py-2 rounded-lg text-xs font-semibold hover:bg-rose-600"
                          >
                            Add to Log
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {chatThinking && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-bl-none">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 bg-gray-300 rounded-full animate-bounce"></span>
                      <span className="h-2 w-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      <span className="h-2 w-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Widgets & Input Area */}
            <div className="p-3 border-t border-gray-100 bg-white">
              <div className="flex gap-2 mb-2">
                <button 
                  onClick={() => { setShowSavedWidget(!showSavedWidget); setShowRecentWidget(false); }} 
                  className={`text-xs px-3 py-1 rounded-full ${showSavedWidget ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  ⭐ Saved
                </button>
                <button 
                  onClick={() => { setShowRecentWidget(!showRecentWidget); setShowSavedWidget(false); }} 
                  className={`text-xs px-3 py-1 rounded-full ${showRecentWidget ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  🕒 Recent
                </button>
              </div>

              {showSavedWidget && (
                <div className="max-h-32 overflow-y-auto border border-gray-100 rounded-lg mb-2 bg-gray-50">
                  {savedMeals.length === 0 && <p className="p-3 text-xs text-gray-400">No saved meals yet.</p>}
                  {savedMeals.map(m => (
                    <div 
                      key={m.id} 
                      onClick={() => { setChatInput(m.name); setShowSavedWidget(false); }} 
                      className="p-2 text-xs hover:bg-rose-50 cursor-pointer border-b border-gray-100 last:border-0"
                    >
                      {m.name}
                    </div>
                  ))}
                </div>
              )}

              {showRecentWidget && (
                <div className="max-h-32 overflow-y-auto border border-gray-100 rounded-lg mb-2 bg-gray-50">
                  {recentMeals.length === 0 && <p className="p-3 text-xs text-gray-400">No recent meals yet.</p>}
                  {recentMeals.map((m, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => { setChatInput(`I ate ${m.description}`); setShowRecentWidget(false); }} 
                      className="p-2 text-xs hover:bg-rose-50 cursor-pointer border-b border-gray-100 last:border-0"
                    >
                      {m.description}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  className="flex-1 p-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-1 focus:ring-rose-400"
                  placeholder="Type a message..."
                />
                <button
                  onClick={handleSendChat}
                  disabled={chatThinking}
                  className="bg-rose-500 text-white p-3 rounded-xl hover:bg-rose-600 transition disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-rose-100 flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {!isGuest && (
          <button onClick={() => setActiveTab('tracker')} className={`flex-1 py-3 font-medium ${activeTab === 'tracker' ? 'text-rose-600 border-t-2 border-rose-500' : 'text-gray-400'}`}>Tracker</button>
        )}
        <button onClick={() => setActiveTab('recipes')} className={`flex-1 py-3 font-medium ${activeTab === 'recipes' ? 'text-rose-600 border-t-2 border-rose-500' : 'text-gray-400'}`}>
          {isGuest ? 'Public Recipes' : 'Recipes'}
        </button>
        {!isGuest && (
          <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 font-medium ${activeTab === 'settings' ? 'text-rose-600 border-t-2 border-rose-500' : 'text-gray-400'}`}>Settings</button>
        )}
      </nav>
    </div>
  );
}

function HistoryChart({ data, dataKey, color, bg }) {
  const chartRef = useRef(null);
  useEffect(() => {
    if (chartRef.current) {
      const chart = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels: data.map(d => d.date),
          datasets: [{ data: data.map(d => d[dataKey]), borderColor: color, backgroundColor: bg, fill: true, borderWidth: 2 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, elements: { line: { tension: 0.4 } }, scales: { y: { beginAtZero: true } } }
      });
      return () => chart.destroy();
    }
  }, [data, dataKey, color, bg]);
  return <canvas ref={chartRef}></canvas>;
}
