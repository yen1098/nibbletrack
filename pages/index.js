import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

// --- PASTE YOUR SUPABASE KEYS HERE ---
const supabaseUrl = 'YOUR_SUPABASE_URL'; 
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
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
  const [goals, setGoals] = useState({ calories_goal: 1200, protein_goal: 90, fiber_goal: 30, added_sugar_goal: 25, sodium_goal: 2000 });
  const [mealInput, setMealInput] = useState('');
  const [imageBase64, setImageBase64] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [activeTab, setActiveTab] = useState('tracker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchMeals(session.user.id);
        fetchGoals(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchMeals(session.user.id);
        fetchGoals(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchMeals = async (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('meals').select('*').eq('user_id', userId).gte('created_at', today);
    if (data) setTodaysMeals(data);
  };

  const fetchGoals = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setGoals(data);
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
        body: JSON.stringify({ mealText: mealInput, imageBase64 })
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
    } catch (error) {
      alert("Error logging meal: " + error.message);
    } finally {
      setAiThinking(false);
    }
  };

  const deleteMeal = async (id) => {
    await supabase.from('meals').delete().eq('id', id);
    setTodaysMeals(todaysMeals.filter(m => m.id !== id));
  };

  // Calculate min/max totals from ranges
  const totals = todaysMeals.reduce((acc, meal) => {
    const cal = parseRange(meal.calories);
    const pro = parseRange(meal.protein);
    const fib = parseRange(meal.fiber);
    const ts = parseRange(meal.total_sugar);
    const as = parseRange(meal.added_sugar);
    const sod = parseRange(meal.sodium);
    
    acc.caloriesMin += cal[0]; acc.caloriesMax += cal[1];
    acc.proteinMin += pro[0]; acc.proteinMax += pro[1];
    acc.fiberMin += fib[0]; acc.fiberMax += fib[1];
    acc.totalSugarMin += ts[0]; acc.totalSugarMax += ts[1];
    acc.addedSugarMin += as[0]; acc.addedSugarMax += as[1];
    acc.sodiumMin += sod[0]; acc.sodiumMax += sod[1];
    return acc;
  }, { caloriesMin: 0, caloriesMax: 0, proteinMin: 0, proteinMax: 0, fiberMin: 0, fiberMax: 0, totalSugarMin: 0, totalSugarMax: 0, addedSugarMin: 0, addedSugarMax: 0, sodiumMin: 0, sodiumMax: 0 });

  const PawSvg = () => (
    <svg className="h-6 w-6 text-rose-400" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
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
        </Head>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-rose-100 max-w-md w-full">
          <div className="flex items-center justify-center gap-2 mb-6">
            <PawSvg />
            <h1 className="text-3xl font-bold text-rose-500 tracking-tight">NibbleTrack</h1>
          </div>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-3 border border-rose-200 rounded-xl bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-300" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-4 border border-rose-200 rounded-xl bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-300" />
          <button onClick={handleLogin} className="w-full bg-rose-500 text-white py-3 rounded-xl mb-2 font-semibold hover:bg-rose-600 transition">Log In</button>
          <button onClick={handleSignUp} className="w-full bg-white text-rose-500 border border-rose-200 py-3 rounded-xl font-semibold hover:bg-rose-50 transition">Sign Up</button>
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-rose-50 pb-24 font-sans">
      <Head>
        <title>NibbleTrack</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com"></script>
      </Head>

      <header className="max-w-6xl mx-auto p-4 sm:p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <PawSvg />
          <h1 className="text-2xl font-bold text-rose-500 tracking-tight">NibbleTrack</h1>
        </div>
        <button onClick={handleLogout} className="text-xs text-rose-400 hover:underline">Log Out</button>
      </header>

      {activeTab === 'tracker' && (
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Log Meal with AI</h2>
              <div className="relative w-full mb-3">
                <textarea value={mealInput} onChange={(e) => setMealInput(e.target.value)} className="w-full p-3 pr-24 border border-rose-200 rounded-xl bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-300" rows="3" placeholder="e.g., 1 cup of Greek yogurt and a handful of blueberries"></textarea>
                <div className="absolute right-3 bottom-3 flex gap-2">
                  <input type="file" id="cameraInput" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                  <button onClick={() => document.getElementById('cameraInput').click()} className="p-2 bg-rose-100 text-rose-500 rounded-lg hover:bg-rose-200 transition" title="Photo Input">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
                  </button>
                </div>
              </div>
              <button onClick={logMeal} disabled={aiThinking} className="w-full bg-rose-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50 hover:bg-rose-600 transition">
                {aiThinking ? 'Analyzing...' : 'Estimate & Log'}
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Today's Log</h2>
              <div className="space-y-3">
                {todaysMeals.length === 0 && <p className="text-rose-300 text-sm text-center py-4">No meals logged yet.</p>}
                {todaysMeals.map(meal => (
                  <div key={meal.id} className="flex justify-between items-start p-3 border border-rose-100 rounded-xl bg-white">
                    <div className="mr-2">
                      <p className="font-medium capitalize text-gray-700">{meal.description}</p>
                      <p className="text-xs text-rose-400 mt-1">P: {meal.protein}g | Fib: {meal.fiber}g | Sod: {meal.sodium}mg</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="font-bold text-rose-500 whitespace-nowrap">{meal.calories} kcal</div>
                      <button onClick={() => deleteMeal(meal.id)} className="text-rose-300 hover:text-red-500 text-xs mt-1">Delete</button>
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
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-gray-600">Calories</span>
                    <span className="text-gray-800">{totals.caloriesMin} - {totals.caloriesMax} / {goals.calories_goal} kcal</span>
                  </div>
                  <div className="w-full bg-rose-100 rounded-full h-2.5"><div className="bg-rose-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totals.caloriesMax / goals.calories_goal) * 100)}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-gray-600">Protein</span>
                    <span className="text-gray-800">{totals.proteinMin} - {totals.proteinMax} / {goals.protein_goal} g</span>
                  </div>
                  <div className="w-full bg-green-100 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totals.proteinMax / goals.protein_goal) * 100)}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-gray-600">Fiber</span>
                    <span className="text-gray-800">{totals.fiberMin} - {totals.fiberMax} / {goals.fiber_goal} g</span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-2.5"><div className="bg-blue-400 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totals.fiberMax / goals.fiber_goal) * 100)}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-gray-600">Sodium</span>
                    <span className="text-gray-800">{totals.sodiumMin} - {totals.sodiumMax} / ≤ {goals.sodium_goal} mg</span>
                  </div>
                  <div className="w-full bg-purple-100 rounded-full h-2.5"><div className="bg-purple-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totals.sodiumMax / goals.sodium_goal) * 100)}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-gray-600">Added Sugar</span>
                    <span className="text-gray-800">{totals.addedSugarMin} - {totals.addedSugarMax} / ≤ {goals.added_sugar_goal} g</span>
                  </div>
                  <div className="w-full bg-yellow-100 rounded-full h-2.5"><div className="bg-yellow-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totals.addedSugarMax / goals.added_sugar_goal) * 100)}%` }}></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white shadow-lg shadow-rose-100 border border-rose-100 rounded-2xl p-2 flex gap-2 w-[95%] max-w-md">
        <button onClick={() => setActiveTab('tracker')} className={`flex-1 py-2 rounded-xl font-medium ${activeTab === 'tracker' ? 'bg-rose-50 text-rose-600' : 'text-gray-400'}`}>Tracker</button>
        <button onClick={() => setActiveTab('recipes')} className={`flex-1 py-2 rounded-xl font-medium ${activeTab === 'recipes' ? 'bg-rose-50 text-rose-600' : 'text-gray-400'}`}>Recipes</button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2 rounded-xl font-medium ${activeTab === 'settings' ? 'bg-rose-50 text-rose-600' : 'text-gray-400'}`}>Settings</button>
      </nav>
    </div>
  );
}
