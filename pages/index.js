import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// --- PASTE YOUR SUPABASE KEYS HERE ---
const supabaseUrl = 'https://trlwqrejwtiypgkbciqu.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybHdxcmVqd3RpeXBna2JjaXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4Mjk3NTgsImV4cCI6MjEwMDQwNTc1OH0.yAWg9aw9JtWpo-4SkbXpD-UlQ_0xCuJWrJTSJHPMG4o';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to parse ranges (e.g., "100-150" -> [100, 150])
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

export default function Home() {
  const [session, setSession] = useState(null);
  const [todaysMeals, setTodaysMeals] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [savedMeals, setSavedMeals] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [goals, setGoals] = useState({ calories_goal: 1200, protein_goal: 90, fiber_goal: 30, added_sugar_goal: 25, sodium_goal: 2000 });
  
  const [mealInput, setMealInput] = useState('');
  const [imageBase64, setImageBase64] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [activeTab, setActiveTab] = useState('tracker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Settings State
  const [settingCal, setSettingCal] = useState(1200);
  const [settingPro, setSettingPro] = useState(90);
  const [settingFib, setSettingFib] = useState(30);
  const [settingAs, setSettingAs] = useState(25);
  const [settingSod, setSettingSod] = useState(2000);

  // Recipe State
  const [recipeName, setRecipeName] = useState('');
  const [recipeInstructions, setRecipeInstructions] = useState('');
  const [ingredientRows, setIngredientRows] = useState([{ qty: '', unit: '', name: '' }]);

  // UI State
  const [quickAddInput, setQuickAddInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mealToDelete, setMealToDelete] = useState(null);

  const quickAddRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId) => {
    fetchMeals(userId);
    fetchHistory(userId);
    fetchSavedMeals(userId);
    fetchRecipes(userId);
    fetchGoals(userId);
  };

  const fetchMeals = async (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('meals').select('*').eq('user_id', userId).gte('created_at', today);
    if (data) setTodaysMeals(data);
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

  const fetchRecipes = async (userId) => {
    const { data } = await supabase.from('recipes').select('*').eq('user_id', userId);
    if (data) setRecipes(data);
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
    await supabase.auth.signOut();
    setTodaysMeals([]);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result);
        setMealInput(prev => prev + (prev ? " " : "") + "[Photo attached]");
      };
      reader.readAsDataURL(file);
    }
  };

  const logMeal = async () => {
    if (!mealInput) return;
    setAiThinking(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealText: mealInput.replace("[Photo attached]", "").trim(), imageBase64 })
      });
      const aiData = await response.json();
      if (aiData.error) throw new Error(aiData.error);

      const { data, error } = await supabase.from('meals').insert([
        { user_id: session.user.id, description: mealInput.replace("[Photo attached]", "").trim(), ...aiData }
      ]).select().single();
      if (error) throw error;

      setTodaysMeals([...todaysMeals, data]);
      setMealInput('');
      setImageBase64(null);
      fetchHistory(session.user.id);
    } catch (error) {
      alert("Error logging meal: " + error.message);
    } finally {
      setAiThinking(false);
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

  const saveQuickMeal = async () => {
    if (quickAddInput && !savedMeals.some(m => m.name === quickAddInput)) {
      const { data } = await supabase.from('saved_meals').insert([{ user_id: session.user.id, name: quickAddInput }]).select().single();
      if (data) setSavedMeals([...savedMeals, data]);
      setQuickAddInput('');
    }
    quickAddRef.current.focus();
  };

  const deleteSavedMeal = async (id) => {
    await supabase.from('saved_meals').delete().eq('id', id);
    setSavedMeals(savedMeals.filter(m => m.id !== id));
  };

  const selectSuggestion = (meal) => {
    setMealInput(prev => prev + (prev ? ", " : "") + meal);
    setQuickAddInput('');
    setShowSuggestions(false);
    quickAddRef.current.focus();
  };

  const saveGoals = async () => {
    const { error } = await supabase.from('profiles').update({
      calories_goal: settingCal, protein_goal: settingPro, fiber_goal: settingFib, added_sugar_goal: settingAs, sodium_goal: settingSod
    }).eq('id', session.user.id);
    if (error) alert(error.message);
    else { fetchGoals(session.user.id); alert("Goals saved!"); }
  };

  const handleRecipeChange = (index, field, value) => {
    const updatedRows = [...ingredientRows];
    updatedRows[index][field] = value;
    setIngredientRows(updatedRows);
  };

  const addIngredientRow = () => setIngredientRows([...ingredientRows, { qty: '', unit: '', name: '' }]);
  const removeIngredientRow = (index) => setIngredientRows(ingredientRows.filter((_, i) => i !== index));

  const saveRecipe = async () => {
    if (!recipeName) return alert("Please enter a recipe name.");
    let details = "Ingredients:\n";
    ingredientRows.forEach(row => {
      if (row.qty || row.unit || row.name) details += `- ${row.qty} ${row.unit} ${row.name}\n`.replace(/\s+/g, ' ').trim() + "\n";
    });
    if (recipeInstructions) details += `\nInstructions:\n${recipeInstructions}`;

    const { data, error } = await supabase.from('recipes').insert([
      { user_id: session.user.id, name: recipeName, details }
    ]).select().single();
    if (error) return alert(error.message);
    
    setRecipes([...recipes, data]);
    setRecipeName('');
    setRecipeInstructions('');
    setIngredientRows([{ qty: '', unit: '', name: '' }]);
  };

  // Voice Input Logic
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognitionRef.current = recognition;
      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event) => setMealInput(prev => prev + (prev ? " " : "") + event.results[0][0].transcript);
      recognition.onerror = (event) => alert("Mic Error: " + event.error);
      recognition.onend = () => setIsRecording(false);
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) return alert("Voice input not supported.");
    if (isRecording) recognitionRef.current.stop();
    else recognitionRef.current.start();
  };

  // Swipe to Delete Logic
  const handleTouchStart = (e, id) => {
    const item = e.currentTarget;
    item.dataset.startX = e.touches[0].clientX;
    item.dataset.startY = e.touches[0].clientY;
    item.style.transition = 'none';
  };

  const handleTouchMove = (e) => {
    const item = e.currentTarget;
    if (!item.dataset.startX) return;
    const deltaX = e.touches[0].clientX - parseFloat(item.dataset.startX);
    const deltaY = e.touches[0].clientY - parseFloat(item.dataset.startY);
    if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && Math.abs(deltaX) > 10) {
      const translateX = Math.min(0, Math.max(deltaX, -120));
      item.style.transform = `translateX(${translateX}px)`;
      if (deltaX < -15) item.style.boxShadow = '0 4px 6px -1px rgba(239, 68, 68, 0.2)';
    }
  };

  const handleTouchEnd = (e, id) => {
    const item = e.currentTarget;
    item.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
    const deltaX = e.changedTouches[0].clientX - parseFloat(item.dataset.startX);
    if (deltaX < -80) requestDelete(id);
    item.style.transform = 'translateX(0)';
    item.style.boxShadow = 'none';
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

  const PawSvg = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 14c-3.3 0-6 2.4-6 5.2 0 1.5.8 2.3 1.9 2.3.8 0 1.4-.2 2-.4.6-.2 1.2-.3 2.1-.3s1.5.1 2.1.3c.6.2 1.2.4 2 .4 1.1 0 1.9-.8 1.9-2.3 0-2.8-2.7-5.2-6-5.2z"/>
      <ellipse cx="5.5" cy="11" rx="1.8" ry="2.2"/>
      <ellipse cx="9.8" cy="8.5" rx="1.8" ry="2.4"/>
      <ellipse cx="14.2" cy="8.5" rx="1.8" ry="2.4"/>
      <ellipse cx="18.5" cy="11" rx="1.8" ry="2.2"/>
    </svg>
  );

  // --- LOGIN SCREEN ---
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 p-4 font-sans">
        <Head>
          <title>NibbleTrack</title>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
          <script src="https://cdn.tailwindcss.com"></script>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        </Head>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-rose-100 max-w-md w-full">
          <div className="flex items-center justify-center gap-2 mb-6">
            <PawSvg className="h-8 w-8 text-rose-400" />
            <h1 className="text-3xl font-bold text-rose-500 tracking-tight">NibbleTrack</h1>
          </div>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-3 border border-rose-200 rounded-xl bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-300 text-base" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-4 border border-rose-200 rounded-xl bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-300 text-base" />
          <button onClick={handleLogin} className="w-full bg-rose-500 text-white py-3 rounded-xl mb-2 font-semibold hover:bg-rose-600 transition">Log In</button>
          <button onClick={handleSignUp} className="w-full bg-white text-rose-500 border border-rose-200 py-3 rounded-xl font-semibold hover:bg-rose-50 transition">Sign Up</button>
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-rose-50 pb-24 font-sans" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <Head>
        <title>NibbleTrack</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </Head>

      <header className="max-w-6xl mx-auto p-4 sm:p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <PawSvg className="h-6 w-6 text-rose-400" />
          <h1 className="text-2xl font-bold text-rose-500 tracking-tight">NibbleTrack</h1>
        </div>
        <button onClick={handleLogout} className="text-xs text-rose-400 hover:underline">Log Out</button>
      </header>

      {/* ================= TRACKER VIEW ================= */}
      {activeTab === 'tracker' && (
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 relative">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Log Meal with AI</h2>
              <div className="mb-3 relative">
                <label className="text-xs font-medium text-rose-400 uppercase tracking-wider mb-1 block">Quick Add / Saved Meals</label>
                <div className="flex w-full">
                  <input ref={quickAddRef} type="text" value={quickAddInput} onChange={(e) => { setQuickAddInput(e.target.value); setShowSuggestions(true); }} className="flex-1 min-w-0 p-2.5 border border-rose-200 rounded-l-xl text-base focus:ring-1 focus:ring-rose-500 focus:outline-none z-10 bg-rose-50/50 box-border" placeholder="Type to search or create..." />
                  <button onClick={saveQuickMeal} className="px-3 bg-rose-100 border border-l-0 border-rose-200 rounded-r-xl text-xs text-rose-600 font-medium hover:bg-rose-200 whitespace-nowrap transition box-border">+ Save text</button>
                </div>
                {showSuggestions && quickAddInput && savedMeals.filter(m => m.name.toLowerCase().includes(quickAddInput.toLowerCase())).length > 0 && (
                  <div className="absolute z-20 w-[calc(100%-3rem)] bg-white border border-rose-100 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {savedMeals.filter(m => m.name.toLowerCase().includes(quickAddInput.toLowerCase())).map(m => (
                      <div key={m.id} onClick={() => selectSuggestion(m.name)} className="p-2 hover:bg-rose-50 cursor-pointer text-sm border-b border-rose-50 last:border-0">{m.name}</div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="relative w-full">
                <textarea value={mealInput} onChange={(e) => setMealInput(e.target.value)} className="w-full p-3 pr-24 border border-rose-200 rounded-xl text-base focus:ring-2 focus:ring-rose-300 focus:outline-none bg-rose-50/30 box-border" rows="3" placeholder="Type, speak, or photograph your meal..."></textarea>
                <div className="absolute right-3 bottom-3 flex gap-2">
                  <button onClick={toggleMic} className={`p-2 rounded-lg transition ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-rose-100 text-rose-500 hover:bg-rose-200'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                  </button>
                  <input type="file" id="cameraInput" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                  <button onClick={() => document.getElementById('cameraInput').click()} className="p-2 bg-rose-100 text-rose-500 rounded-lg hover:bg-rose-200 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
                  </button>
                </div>
              </div>

              <button onClick={logMeal} disabled={aiThinking} className="mt-3 w-full bg-rose-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50 hover:bg-rose-600 transition flex justify-center items-center shadow-sm shadow-rose-200">
                {aiThinking ? 'Analyzing...' : 'Estimate & Log'}
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Today's Log</h2>
              <div className="space-y-3">
                {todaysMeals.length === 0 && <div className="flex items-center justify-center gap-2 text-rose-300 text-sm py-4"><PawSvg className="h-5 w-5" /> No meals logged yet.</div>}
                {todaysMeals.map(meal => (
                  <div key={meal.id} className="relative overflow-hidden rounded-xl" style={{ backgroundColor: '#fee2e2' }}>
                    <div className="swipe-content bg-white p-3 flex justify-between items-start border border-rose-100 rounded-xl" style={{ touchAction: 'pan-y' }} onTouchStart={(e) => handleTouchStart(e, meal.id)} onTouchMove={handleTouchMove} onTouchEnd={(e) => handleTouchEnd(e, meal.id)}>
                      <div className="mr-2 pointer-events-none">
                        <p className="font-medium capitalize text-gray-700">{meal.description}</p>
                        <p className="text-xs text-rose-400 mt-1">P: {meal.protein}g | Fib: {meal.fiber}g | Sod: {meal.sodium}mg</p>
                      </div>
                      <div className="font-bold text-rose-500 whitespace-nowrap pointer-events-none">{meal.calories} kcal</div>
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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 h-fit overflow-hidden">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Add Healthy Recipe</h2>
            <input type="text" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} className="w-full p-3 mb-4 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-300 focus:outline-none bg-rose-50/30 box-border text-base" placeholder="Recipe Name (e.g., Quinoa Salad)" />
            <label className="text-xs font-medium text-rose-400 uppercase tracking-wider block mb-3">Ingredients</label>
            <div className="space-y-3 mb-3">
              {ingredientRows.map((row, index) => (
                <div key={index} className="flex gap-2 items-center min-w-0">
                  <input type="text" value={row.qty} onChange={(e) => handleRecipeChange(index, 'qty', e.target.value)} className="w-16 min-w-0 p-2.5 text-center bg-rose-50 border border-rose-200 rounded-lg text-base focus:outline-none box-border" placeholder="Qty" />
                  <select value={row.unit} onChange={(e) => handleRecipeChange(index, 'unit', e.target.value)} className="w-24 min-w-0 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-base focus:outline-none box-border">
                    <option value="">Unit</option>
                    <option value="cup">cup</option>
                    <option value="tbsp">tbsp</option>
                    <option value="tsp">tsp</option>
                    <option value="piece">piece</option>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                  </select>
                  <input type="text" value={row.name} onChange={(e) => handleRecipeChange(index, 'name', e.target.value)} className="flex-1 min-w-0 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-base focus:outline-none box-border" placeholder="Ingredient" />
                  <button onClick={() => removeIngredientRow(index)} className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-100 rounded-lg transition flex items-center justify-center w-10 h-10 flex-shrink-0">✕</button>
                </div>
              ))}
            </div>
            <button onClick={addIngredientRow} className="w-full p-2.5 border border-dashed border-rose-300 rounded-xl text-sm text-rose-500 font-medium hover:bg-rose-50 transition flex items-center justify-center gap-1 mb-6 box-border">+ Add Ingredient</button>
            <label className="text-xs font-medium text-rose-400 uppercase tracking-wider block mb-2">Instructions</label>
            <textarea value={recipeInstructions} onChange={(e) => setRecipeInstructions(e.target.value)} className="w-full p-3 border border-rose-200 rounded-xl mb-4 focus:ring-2 focus:ring-rose-300 focus:outline-none bg-rose-50/30 box-border text-base" rows="4" placeholder="Steps to prepare..."></textarea>
            <button onClick={saveRecipe} className="w-full bg-green-500 text-white font-semibold py-3 rounded-xl hover:bg-green-600 transition shadow-sm shadow-green-200 box-border">Save Recipe</button>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">My Recipes</h2>
            <div className="space-y-3">
              {recipes.length === 0 && <div className="flex items-center justify-center gap-2 text-rose-300 text-sm py-4"><PawSvg className="h-5 w-5" /> No recipes saved yet.</div>}
              {recipes.map(r => (
                <div key={r.id} className="p-4 border border-rose-100 rounded-xl bg-white">
                  <h3 className="font-semibold text-gray-800">{r.name}</h3>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{r.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= SETTINGS VIEW ================= */}
      {activeTab === 'settings' && (
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

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Manage Saved Meals</h2>
            <div className="space-y-2">
              {savedMeals.length === 0 && <p className="text-rose-300 text-sm text-center py-4">No saved meals yet.</p>}
              {savedMeals.map(m => (
                <div key={m.id} className="flex justify-between items-center p-3 bg-rose-50/40 border border-rose-100 rounded-xl">
                  <span className="text-sm text-gray-700 capitalize">{m.name}</span>
                  <button onClick={() => deleteSavedMeal(m.id)} className="text-xs text-rose-400 hover:text-red-500 font-medium">Delete</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
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

      {/* Floating Bottom Navigation Overlay */}
      <nav className="fixed left-1/2 -translate-x-1/2 z-50 bg-white shadow-lg shadow-rose-100 border border-rose-100 rounded-2xl p-2 flex gap-2 w-[95%] max-w-md" style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <button onClick={() => setActiveTab('tracker')} className={`flex-1 py-2 rounded-xl font-medium ${activeTab === 'tracker' ? 'bg-rose-50 text-rose-600' : 'text-gray-400'}`}>Tracker</button>
        <button onClick={() => setActiveTab('recipes')} className={`flex-1 py-2 rounded-xl font-medium ${activeTab === 'recipes' ? 'bg-rose-50 text-rose-600' : 'text-gray-400'}`}>Recipes</button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2 rounded-xl font-medium ${activeTab === 'settings' ? 'bg-rose-50 text-rose-600' : 'text-gray-400'}`}>Settings</button>
      </nav>
    </div>
  );
}

// Chart Component
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
