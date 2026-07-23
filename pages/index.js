import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

// --- PASTE YOUR SUPABASE KEYS HERE ---
const supabaseUrl = 'https://trlwqrejwtiypgkbciqu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybHdxcmVqd3RpeXBna2JjaXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4Mjk3NTgsImV4cCI6MjEwMDQwNTc1OH0.yAWg9aw9JtWpo-4SkbXpD-UlQ_0xCuJWrJTSJHPMG4o';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  const [session, setSession] = useState(null);
  const [todaysMeals, setTodaysMeals] = useState([]);
  const [goals, setGoals] = useState({ calories: 1200, protein: 90, fiber: 30, addedSugar: 25, sodium: 2000 });
  const [mealInput, setMealInput] = useState('');
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

  const logMeal = async () => {
    if (!mealInput) return;
    setAiThinking(true);

    try {
      // 1. Call our secure backend to get macros from Z.ai
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealText: mealInput })
      });
      const aiData = await response.json();

      if (aiData.error) throw new Error(aiData.error);

      // 2. Save to Supabase
      const { data, error } = await supabase.from('meals').insert([
        {
          user_id: session.user.id,
          description: mealInput,
          ...aiData
        }
      ]).select().single();

      if (error) throw error;

      // 3. Update UI
      setTodaysMeals([...todaysMeals, data]);
      setMealInput('');
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

  const totals = todaysMeals.reduce((acc, meal) => {
    acc.calories += meal.calories || 0;
    acc.protein += meal.protein || 0;
    acc.fiber += meal.fiber || 0;
    acc.totalSugar += meal.total_sugar || 0;
    acc.addedSugar += meal.added_sugar || 0;
    acc.sodium += meal.sodium || 0;
    return acc;
  }, { calories: 0, protein: 0, fiber: 0, totalSugar: 0, addedSugar: 0, sodium: 0 });

  // --- LOGIN SCREEN ---
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 p-4">
        <Head><title>NibbleTrack</title></Head>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-rose-100 max-w-md w-full">
          <h1 className="text-3xl font-bold text-rose-500 mb-6 text-center">NibbleTrack</h1>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-3 border border-rose-200 rounded-xl bg-rose-50/30" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-4 border border-rose-200 rounded-xl bg-rose-50/30" />
          <button onClick={handleLogin} className="w-full bg-rose-500 text-white py-3 rounded-xl mb-2">Log In</button>
          <button onClick={handleSignUp} className="w-full bg-white text-rose-500 border border-rose-200 py-3 rounded-xl">Sign Up</button>
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-rose-50 pb-24">
      <Head><title>NibbleTrack</title></Head>

      <header className="max-w-6xl mx-auto p-4 sm:p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-rose-500">NibbleTrack</h1>
        <button onClick={handleLogout} className="text-xs text-rose-400 hover:underline">Log Out</button>
      </header>

      {activeTab === 'tracker' && (
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Log Meal with AI</h2>
              <textarea value={mealInput} onChange={(e) => setMealInput(e.target.value)} className="w-full p-3 border border-rose-200 rounded-xl bg-rose-50/30 mb-3" rows="3" placeholder="e.g., 1 cup of Greek yogurt and a handful of blueberries"></textarea>
              <button onClick={logMeal} disabled={aiThinking} className="w-full bg-rose-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
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
                    <span className="text-gray-800">{totals.calories} / {goals.calories_goal} kcal</span>
                  </div>
                  <div className="w-full bg-rose-100 rounded-full h-2.5"><div className="bg-rose-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (totals.calories / goals.calories_goal) * 100)}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-gray-600">Protein</span>
                    <span className="text-gray-800">{totals.protein} / {goals.protein_goal} g</span>
                  </div>
                  <div className="w-full bg-green-100 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (totals.protein / goals.protein_goal) * 100)}%` }}></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recipes' && (
        <div className="max-w-4xl mx-auto p-4 text-center text-gray-500">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">My Recipes</h2>
          <p>Recipe saving and viewing will go here!</p>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white shadow-lg shadow-rose-100 border border-rose-100 rounded-2xl p-2 flex gap-2 w-[95%] max-w-md">
        <button onClick={() => setActiveTab('tracker')} className={`flex-1 py-2 rounded-xl ${activeTab === 'tracker' ? 'bg-rose-50 text-rose-600' : 'text-gray-400'}`}>Tracker</button>
        <button onClick={() => setActiveTab('recipes')} className={`flex-1 py-2 rounded-xl ${activeTab === 'recipes' ? 'bg-rose-50 text-rose-600' : 'text-gray-400'}`}>Recipes</button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2 rounded-xl ${activeTab === 'settings' ? 'bg-rose-50 text-rose-600' : 'text-gray-400'}`}>Settings</button>
      </nav>
    </div>
  );
}
