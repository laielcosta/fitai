import React, { useState, useRef, useEffect } from 'react';
import { Camera, Utensils, Dumbbell, Target, Plus, Home, MessageCircle, TrendingUp, Clock, Zap, Send, Bot, User, Scan, Search } from 'lucide-react';

const FitAIApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [fdcApiKey, setFdcApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showFdcApiKeyInput, setShowFdcApiKeyInput] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [meals, setMeals] = useState([
    {
      id: 1,
      name: 'Avena con frutas',
      time: '08:30',
      calories: 350,
      protein: 12,
      carbs: 58,
      fat: 8,
      category: 'desayuno',
      image: '🥣'
    },
    {
      id: 2,
      name: 'Pollo con arroz',
      time: '13:15',
      calories: 520,
      protein: 35,
      carbs: 45,
      fat: 18,
      category: 'almuerzo',
      image: '🍖'
    },
    {
      id: 3,
      name: 'Ensalada de atún',
      time: '20:30',
      calories: 280,
      protein: 25,
      carbs: 15,
      fat: 12,
      category: 'cena',
      image: '🥗'
    }
  ]);

  const [workouts, setWorkouts] = useState([
    {
      id: 1,
      name: 'Entrenamiento de Pecho',
      duration: '45 min',
      exercises: 8,
      calories: 280,
      date: 'Hoy'
    },
    {
      id: 2,
      name: 'Cardio HIIT',
      duration: '30 min',
      exercises: 6,
      calories: 320,
      date: 'Ayer'
    }
  ]);

  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      message: '¡Hola! Soy tu asistente de fitness con IA. Puedo ayudarte con preguntas sobre nutrición, entrenamientos y analizar tus patrones alimenticios. ¿En qué puedo ayudarte?'
    }
  ]);

  const [newMessage, setNewMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const [newMeal, setNewMeal] = useState({ 
    name: '', 
    calories: '', 
    protein: '', 
    carbs: '', 
    fat: '', 
    serving: '100', 
    category: 'desayuno' 
  });
  
  const [newWorkout, setNewWorkout] = useState({ name: '', duration: '', exercises: '' });

  // Metas diarias (puedes hacer esto configurable más tarde)
  const dailyGoals = {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65
  };

  // Función para buscar alimentos en FoodData Central
  const searchFoodByName = async (query) => {
    if (!fdcApiKey || !query.trim()) {
      alert('Por favor, configura tu API Key de FoodData Central y escribe un término de búsqueda');
      setShowFdcApiKeyInput(true);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${fdcApiKey}&query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy&pageSize=10`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.foods && data.foods.length > 0) {
        setSearchResults(data.foods.slice(0, 5));
      } else {
        setSearchResults([]);
        alert('No se encontraron alimentos con ese nombre');
      }
    } catch (error) {
      console.error('Error searching food:', error);
      alert('Error al buscar el alimento. Verifica tu API Key de FoodData Central.');
    } finally {
      setIsSearching(false);
    }
  };

  // Función para obtener detalles nutricionales por FDC ID
  const getFoodNutrition = async (fdcId) => {
    if (!fdcApiKey) {
      alert('Por favor, configura tu API Key de FoodData Central');
      setShowFdcApiKeyInput(true);
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${fdcApiKey}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      const nutrients = data.foodNutrients || [];
      
      const energyNutrient = nutrients.find(n => n.nutrient.id === 1008);
      const proteinNutrient = nutrients.find(n => n.nutrient.id === 1003);
      const carbsNutrient = nutrients.find(n => n.nutrient.id === 1005);
      const fatNutrient = nutrients.find(n => n.nutrient.id === 1004);
      
      setNewMeal({
        name: data.description || 'Alimento encontrado',
        calories: energyNutrient ? Math.round(energyNutrient.amount) : 0,
        protein: proteinNutrient ? Math.round(proteinNutrient.amount * 10) / 10 : 0,
        carbs: carbsNutrient ? Math.round(carbsNutrient.amount * 10) / 10 : 0,
        fat: fatNutrient ? Math.round(fatNutrient.amount * 10) / 10 : 0,
        serving: '100',
        category: 'desayuno'
      });
      
      setSearchResults([]);
      setSearchQuery('');
      
    } catch (error) {
      console.error('Error getting food nutrition:', error);
      alert('Error al obtener información nutricional del alimento.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Función para buscar por código de barras usando OpenFoodFacts
  const searchByBarcode = async (barcode) => {
    if (!barcode || barcode.length < 8) {
      alert('Por favor, ingresa un código de barras válido (mínimo 8 dígitos)');
      return;
    }

    setIsAnalyzing(true);
    try {
      const openFoodFactsResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const openFoodFactsData = await openFoodFactsResponse.json();
      
      if (openFoodFactsData.status === 1 && openFoodFactsData.product) {
        const product = openFoodFactsData.product;
        
        if (product.nutriments) {
          setNewMeal({
            name: product.product_name || product.product_name_es || 'Producto encontrado',
            calories: Math.round(product.nutriments['energy-kcal_100g'] || product.nutriments['energy-kcal'] || 0),
            protein: Math.round((product.nutriments.proteins_100g || product.nutriments.proteins || 0) * 10) / 10,
            carbs: Math.round((product.nutriments.carbohydrates_100g || product.nutriments.carbohydrates || 0) * 10) / 10,
            fat: Math.round((product.nutriments.fat_100g || product.nutriments.fat || 0) * 10) / 10,
            serving: '100',
            category: 'desayuno'
          });
        } else {
          const productName = product.product_name || product.product_name_es;
          if (productName && fdcApiKey) {
            await searchFoodByName(productName);
            return;
          } else {
            setNewMeal({
              name: productName || 'Producto encontrado',
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              serving: '100',
              category: 'desayuno'
            });
          }
        }
      } else {
        alert('Producto no encontrado. Puedes agregar la información manualmente.');
        setNewMeal({
          name: `Producto ${barcode}`,
          calories: '',
          protein: '',
          carbs: '',
          fat: '',
          serving: '100',
          category: 'desayuno'
        });
      }
      
      setBarcodeInput('');
    } catch (error) {
      console.error('Error searching barcode:', error);
      alert('Error al buscar el código de barras. Intenta nuevamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Función para iniciar escáner de cámara (simulado)
  const startBarcodeScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanningBarcode(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('No se pudo acceder a la cámara. Puedes ingresar el código manualmente.');
    }
  };

  const stopBarcodeScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanningBarcode(false);
  };

  // Función para convertir imagen a base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Análisis de imagen con OpenAI Vision
  const analyzeImageWithAI = async (imageFile) => {
    if (!apiKey) {
      alert('Por favor, configura tu API Key de OpenAI primero');
      setShowApiKeyInput(true);
      return;
    }

    setIsAnalyzing(true);
    try {
      const base64Image = await convertToBase64(imageFile);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analiza esta imagen de comida y proporciona la siguiente información en formato JSON exacto:\n{\n  \"name\": \"nombre del plato\",\n  \"calories\": número_de_calorías,\n  \"protein\": gramos_de_proteína,\n  \"carbs\": gramos_de_carbohidratos,\n  \"fat\": gramos_de_grasa\n}\n\nSolo responde con el JSON, sin texto adicional."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: base64Image
                  }
                }
              ]
            }
          ],
          max_tokens: 300
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        try {
          const analysis = JSON.parse(data.choices[0].message.content);
          setNewMeal({
            name: analysis.name,
            calories: analysis.calories.toString(),
            protein: analysis.protein.toString(),
            carbs: analysis.carbs.toString(),
            fat: analysis.fat.toString(),
            serving: '100',
            category: 'desayuno'
          });
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
          alert('Error al procesar la respuesta de la IA');
        }
      } else {
        throw new Error('Respuesta inválida de la API');
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      alert('Error al analizar la imagen. Verifica tu API Key.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Manejar selección de archivo
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      analyzeImageWithAI(file);
    }
  };

  // Función para crear el contexto del usuario
  const getUserContext = () => {
    const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
    const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);
    const totalCarbs = meals.reduce((sum, meal) => sum + meal.carbs, 0);
    const totalFat = meals.reduce((sum, meal) => sum + meal.fat, 0);
    
    return `
    Contexto del usuario:
    
    COMIDAS DE HOY:
    ${meals.map(meal => `- ${meal.name} (${meal.time}): ${meal.calories} cal, ${meal.protein}g proteína, ${meal.carbs}g carbos, ${meal.fat}g grasa`).join('\n')}
    
    TOTALES DIARIOS:
    - Calorías totales: ${totalCalories}
    - Proteína total: ${totalProtein}g
    - Carbohidratos totales: ${totalCarbs}g
    - Grasas totales: ${totalFat}g
    
    ENTRENAMIENTOS RECIENTES:
    ${workouts.slice(0, 3).map(workout => `- ${workout.name} (${workout.date}): ${workout.duration}, ${workout.exercises} ejercicios, ${workout.calories} cal quemadas`).join('\n')}
    
    Responde como un entrenador personal y nutricionista experto, considerando este contexto.
    `;
  };

  // Enviar mensaje al asistente IA
  const sendMessageToAI = async () => {
    if (!newMessage.trim() || !apiKey) {
      if (!apiKey) {
        alert('Por favor, configura tu API Key de OpenAI primero');
        setShowApiKeyInput(true);
      }
      return;
    }

    const userMessage = {
      id: chatMessages.length + 1,
      type: 'user',
      message: newMessage
    };

    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsThinking(true);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: getUserContext()
            },
            {
              role: "user",
              content: newMessage
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const assistantMessage = {
          id: chatMessages.length + 2,
          type: 'assistant',
          message: data.choices[0].message.content
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Respuesta inválida de la API');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: chatMessages.length + 2,
        type: 'assistant',
        message: 'Lo siento, hubo un error al procesar tu mensaje. Verifica tu conexión y API Key.'
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const addMeal = () => {
    if (newMeal.name && newMeal.calories) {
      const servingRatio = parseInt(newMeal.serving) / 100;
      const meal = {
        id: meals.length + 1,
        name: newMeal.name,
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        calories: Math.round(parseInt(newMeal.calories) * servingRatio),
        protein: Math.round(parseFloat(newMeal.protein) * servingRatio * 10) / 10,
        carbs: Math.round(parseFloat(newMeal.carbs) * servingRatio * 10) / 10,
        fat: Math.round(parseFloat(newMeal.fat) * servingRatio * 10) / 10,
        category: newMeal.category,
        image: '📸'
      };
      setMeals([...meals, meal]);
      setNewMeal({ name: '', calories: '', protein: '', carbs: '', fat: '', serving: '100', category: 'desayuno' });
      setSearchResults([]);
      setSearchQuery('');
    }
  };

  const addWorkout = () => {
    if (newWorkout.name && newWorkout.duration) {
      const workout = {
        id: workouts.length + 1,
        name: newWorkout.name,
        duration: newWorkout.duration,
        exercises: parseInt(newWorkout.exercises) || 0,
        calories: Math.floor(Math.random() * 200) + 150,
        date: 'Hoy'
      };
      setWorkouts([...workouts, workout]);
      setNewWorkout({ name: '', duration: '', exercises: '' });
    }
  };

  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + meal.carbs, 0);
  const totalFat = meals.reduce((sum, meal) => sum + meal.fat, 0);

  // Componente del gráfico de dona para calorías
  const CalorieDonutChart = ({ consumed, goal }) => {
    const remaining = Math.max(0, goal - consumed);
    const percentage = Math.min(100, (consumed / goal) * 100);
    const circumference = 2 * Math.PI * 45;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={consumed > goal ? "#ef4444" : "#3b82f6"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-800">{consumed}</span>
          <span className="text-xs text-gray-500">de {goal}</span>
        </div>
      </div>
    );
  };

  // Componente de barra de progreso para macros
  const MacroProgressBar = ({ label, consumed, goal, color, unit = 'g' }) => {
    const percentage = Math.min(100, (consumed / goal) * 100);
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm text-gray-600">{consumed}{unit} / {goal}{unit}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ease-in-out ${color}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  // Agrupar comidas por categoría
  const groupMealsByCategory = () => {
    return {
      desayuno: meals.filter(meal => meal.category === 'desayuno'),
      almuerzo: meals.filter(meal => meal.category === 'almuerzo'),
      cena: meals.filter(meal => meal.category === 'cena')
    };
  };

  const HomeScreen = () => {
    const groupedMeals = groupMealsByCategory();
    
    return (
      <div className="p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Fit<span className="text-blue-600">AI</span>
          </h1>
          <p className="text-gray-600">Tu asistente de fitness inteligente</p>
          
          {showApiKeyInput && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800 mb-2">Configura tu API Key de OpenAI:</p>
              <div className="flex space-x-2">
                <input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 p-2 text-sm border border-yellow-300 rounded focus:outline-none focus:border-yellow-500"
                />
                <button
                  onClick={() => setShowApiKeyInput(false)}
                  className="px-3 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}

          {showFdcApiKeyInput && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800 mb-2">Configura tu API Key de FoodData Central:</p>
              <div className="flex space-x-2">
                <input
                  type="password"
                  placeholder="API Key de USDA FoodData Central"
                  value={fdcApiKey}
                  onChange={(e) => setFdcApiKey(e.target.value)}
                  className="flex-1 p-2 text-sm border border-green-300 rounded focus:outline-none focus:border-green-500"
                />
                <button
                  onClick={() => setShowFdcApiKeyInput(false)}
                  className="px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                >
                  Guardar
                </button>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Obtén tu API Key gratuita en: api.nal.usda.gov/fdc/
              </p>
            </div>
          )}
          
          {!apiKey && (
            <button
              onClick={() => setShowApiKeyInput(true)}
              className="mt-2 text-sm text-blue-600 underline"
            >
              Configurar API Key OpenAI para IA
            </button>
          )}

          {!fdcApiKey && (
            <button
              onClick={() => setShowFdcApiKeyInput(true)}
              className="mt-2 block text-sm text-green-600 underline"
            >
              Configurar API Key FoodData Central
            </button>
          )}
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold mb-4 text-center">Calorías de Hoy</h2>
          <div className="flex justify-center">
            <CalorieDonutChart consumed={totalCalories} goal={dailyGoals.calories} />
          </div>
          <div className="text-center mt-4">
            <p className="text-sm opacity-90">
              Restantes: {Math.max(0, dailyGoals.calories - totalCalories)} calorías
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Macronutrientes</h3>
          <div className="space-y-4">
            <MacroProgressBar 
              label="Proteínas" 
              consumed={totalProtein} 
              goal={dailyGoals.protein} 
              color="bg-red-500" 
            />
            <MacroProgressBar 
              label="Carbohidratos" 
              consumed={totalCarbs} 
              goal={dailyGoals.carbs} 
              color="bg-yellow-500" 
            />
            <MacroProgressBar 
              label="Grasas" 
              consumed={totalFat} 
              goal={dailyGoals.fat} 
              color="bg-green-500" 
            />
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedMeals).map(([category, categoryMeals]) => {
            const categoryEmojis = {
              desayuno: '🌅',
              almuerzo: '☀️',
              cena: '🌙'
            };
            
            const categoryNames = {
              desayuno: 'Desayuno',
              almuerzo: 'Almuerzo',
              cena: 'Cena'
            };

            const categoryCalories = categoryMeals.reduce((sum, meal) => sum + meal.calories, 0);

            return (
              <div key={category} className="bg-white rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <span className="mr-2 text-xl">{categoryEmojis[category]}</span>
                    {categoryNames[category]}
                  </h3>
                  <span className="text-sm font-medium text-blue-600">
                    {categoryCalories} cal
                  </span>
                </div>
                
                {categoryMeals.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">No hay alimentos registrados</p>
                    <button
                      onClick={() => setActiveTab('nutrition')}
                      className="mt-2 text-blue-600 text-sm underline"
                    >
                      Agregar alimento
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categoryMeals.map((meal) => (
                      <div key={meal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <span className="text-lg mr-3">{meal.image}</span>
                          <div>
                            <h4 className="font-medium text-gray-800 text-sm">{meal.name}</h4>
                            <p className="text-xs text-gray-500 flex items-center">
                              <Clock size={12} className="mr-1" />
                              {meal.time}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600 text-sm">{meal.calories} cal</div>
                          <div className="text-xs text-gray-500">
                            P:{meal.protein}g C:{meal.carbs}g G:{meal.fat}g
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => setActiveTab('nutrition')}
            className="bg-green-500 text-white p-4 rounded-xl flex flex-col items-center space-y-2 hover:bg-green-600 transition-colors"
          >
            <Plus size={20} />
            <span className="font-medium text-xs">Agregar</span>
          </button>
          <button 
            onClick={() => setActiveTab('workouts')}
            className="bg-purple-500 text-white p-4 rounded-xl flex flex-col items-center space-y-2 hover:bg-purple-600 transition-colors"
          >
            <Dumbbell size={20} />
            <span className="font-medium text-xs">Entrenar</span>
          </button>
          <button 
            onClick={() => setActiveTab('assistant')}
            className="bg-blue-500 text-white p-4 rounded-xl flex flex-col items-center space-y-2 hover:bg-blue-600 transition-colors"
          >
            <Bot size={20} />
            <span className="font-medium text-xs">Asistente</span>
          </button>
        </div>
      </div>
    );
  };

  const NutritionScreen = () => (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center">
          <Utensils className="mr-2" size={28} />
          Nutrición
        </h2>
        <p className="text-gray-600">Escanea códigos de barras o busca alimentos</p>
      </div>

      <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl p-6 text-white">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Scan className="mr-2" size={20} />
          Escáner de Códigos de Barras
        </h3>
        
        {isScanningBarcode ? (
          <div className="space-y-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-48 bg-black rounded-lg"
            />
            <div className="flex space-x-2">
              <button 
                onClick={stopBarcodeScanner}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Detener Escáner
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button 
              onClick={startBarcodeScanner}
              className="w-full bg-white text-gray-800 py-3 rounded-xl font-medium hover:bg-gray-100 transition-colors flex items-center justify-center"
            >
              <Camera className="mr-2" size={20} />
              Activar Cámara para Código de Barras
            </button>
            
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="O ingresa código manualmente"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="flex-1 p-2 text-gray-800 rounded-lg text-sm"
              />
              <button
                onClick={() => searchByBarcode(barcodeInput)}
                disabled={!barcodeInput || isAnalyzing}
                className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <Search size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <Search className="mr-2" size={20} />
          Buscar por Nombre
        </h3>
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            placeholder="Buscar alimento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchFoodByName(searchQuery)}
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => searchFoodByName(searchQuery)}
            disabled={!searchQuery || isSearching || !fdcApiKey}
            className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Search size={20} />
          </button>
        </div>

        {!fdcApiKey && (
          <p className="text-sm text-gray-500 mb-4">Configura tu API Key de FoodData Central para buscar alimentos</p>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="font-medium text-gray-700">Resultados:</h4>
            {searchResults.map((food, index) => (
              <button
                key={index}
                onClick={() => getFoodNutrition(food.fdcId)}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-800">{food.description}</div>
                <div className="text-sm text-gray-500">
                  {food.dataType} • FDC ID: {food.fdcId}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl p-6 text-white">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Camera className="mr-2" size={20} />
          Análisis con IA de Imagen
        </h3>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          ref={fileInputRef}
          className="hidden"
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing || !apiKey}
          className="w-full bg-white text-gray-800 py-3 rounded-xl font-medium hover:bg-gray-100 transition-colors flex items-center justify-center disabled:opacity-50"
        >
          <Camera className="mr-2" size={20} />
          {isAnalyzing ? 'Analizando...' : 'Tomar Foto y Analizar con IA'}
        </button>
        {!apiKey && (
          <p className="text-sm mt-2 opacity-90">Configura tu API Key de OpenAI para usar la IA</p>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          {isAnalyzing ? 'Procesando información...' : 'Datos del alimento'}
        </h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nombre de la comida"
            value={newMeal.name}
            onChange={(e) => setNewMeal({...newMeal, name: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              placeholder="Calorías"
              value={newMeal.calories}
              onChange={(e) => setNewMeal({...newMeal, calories: e.target.value})}
              className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="number"
              placeholder="Porción (g)"
              value={newMeal.serving}
              onChange={(e) => setNewMeal({...newMeal, serving: e.target.value})}
              className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <select
              value={newMeal.category}
              onChange={(e) => setNewMeal({...newMeal, category: e.target.value})}
              className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desayuno">🌅 Desayuno</option>
              <option value="almuerzo">☀️ Almuerzo</option>
              <option value="cena">🌙 Cena</option>
            </select>
            <div></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="number"
              step="0.1"
              placeholder="Proteínas (g)"
              value={newMeal.protein}
              onChange={(e) => setNewMeal({...newMeal, protein: e.target.value})}
              className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="number"
              step="0.1"
              placeholder="Carbohidratos (g)"
              value={newMeal.carbs}
              onChange={(e) => setNewMeal({...newMeal, carbs: e.target.value})}
              className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="number"
              step="0.1"
              placeholder="Grasas (g)"
              value={newMeal.fat}
              onChange={(e) => setNewMeal({...newMeal, fat: e.target.value})}
              className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button 
            onClick={addMeal}
            className="w-full bg-green-500 text-white py-3 rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center"
          >
            <Plus className="mr-2" size={20} />
            Agregar Comida
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-800">Comidas de Hoy</h3>
        {meals.map((meal) => (
          <div key={meal.id} className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{meal.image}</span>
                <div>
                  <h4 className="font-medium text-gray-800">{meal.name}</h4>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-500 flex items-center">
                      <Clock size={14} className="mr-1" />
                      {meal.time}
                    </p>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                      {meal.category === 'desayuno' ? '🌅 Desayuno' :
                       meal.category === 'almuerzo' ? '☀️ Almuerzo' : '🌙 Cena'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-blue-600">{meal.calories} cal</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center bg-red-50 p-2 rounded">
                <div className="font-medium text-red-600">{meal.protein}g</div>
                <div className="text-gray-500">Proteína</div>
              </div>
              <div className="text-center bg-yellow-50 p-2 rounded">
                <div className="font-medium text-yellow-600">{meal.carbs}g</div>
                <div className="text-gray-500">Carbos</div>
              </div>
              <div className="text-center bg-green-50 p-2 rounded">
                <div className="font-medium text-green-600">{meal.fat}g</div>
                <div className="text-gray-500">Grasas</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const WorkoutsScreen = () => (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center">
          <Dumbbell className="mr-2" size={28} />
          Entrenamientos
        </h2>
        <p className="text-gray-600">Registra tu actividad física</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Nuevo Entrenamiento</h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nombre del entrenamiento"
            value={newWorkout.name}
            onChange={(e) => setNewWorkout({...newWorkout, name: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Duración (ej: 45 min)"
              value={newWorkout.duration}
              onChange={(e) => setNewWorkout({...newWorkout, duration: e.target.value})}
              className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <input
              type="number"
              placeholder="Nº ejercicios"
              value={newWorkout.exercises}
              onChange={(e) => setNewWorkout({...newWorkout, exercises: e.target.value})}
              className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <button 
            onClick={addWorkout}
            className="w-full bg-purple-500 text-white py-3 rounded-xl font-medium hover:bg-purple-600 transition-colors flex items-center justify-center"
          >
            <Plus className="mr-2" size={20} />
            Agregar Entrenamiento
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-800">Historial de Entrenamientos</h3>
        {workouts.map((workout) => (
          <div key={workout.id} className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-800">{workout.name}</h4>
                <p className="text-sm text-gray-500">{workout.date}</p>
              </div>
              <div className="text-right">
                <div className="font-bold text-purple-600 flex items-center">
                  <Zap size={16} className="mr-1" />
                  {workout.calories} cal
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <div className="font-medium text-purple-600">{workout.duration}</div>
                <div className="text-sm text-gray-500">Duración</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="font-medium text-blue-600">{workout.exercises}</div>
                <div className="text-sm text-gray-500">Ejercicios</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const AssistantScreen = () => (
    <div className="p-6 space-y-6 h-screen flex flex-col">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center">
          <Bot className="mr-2" size={28} />
          Asistente IA
        </h2>
        <p className="text-gray-600">Tu entrenador personal inteligente</p>
      </div>

      <div className="flex-1 bg-white rounded-2xl p-4 shadow-lg overflow-y-auto space-y-4">
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
              msg.type === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              <div className="flex items-start space-x-2">
                {msg.type === 'assistant' && <Bot size={16} className="mt-1 text-blue-500" />}
                {msg.type === 'user' && <User size={16} className="mt-1" />}
                <p className="text-sm">{msg.message}</p>
              </div>
            </div>
          </div>
        ))}
        
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-2xl">
              <div className="flex items-center space-x-2">
                <Bot size={16} className="text-blue-500" />
                <p className="text-sm text-gray-600">Pensando...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-lg">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Pregunta sobre nutrición, entrenamientos..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessageToAI()}
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button 
            onClick={sendMessageToAI}
            disabled={!newMessage.trim() || isThinking || !apiKey}
            className="bg-blue-500 text-white p-3 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
        {!apiKey && (
          <p className="text-sm text-gray-500 mt-2">Configura tu API Key de OpenAI para usar el asistente</p>
        )}
      </div>
    </div>
  );

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'nutrition':
        return <NutritionScreen />;
      case 'workouts':
        return <WorkoutsScreen />;
      case 'assistant':
        return <AssistantScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Fit<span className="text-yellow-300">AI</span></h1>
          <div className="flex items-center space-x-2">
            <TrendingUp size={20} />
            <span className="text-sm">
              {apiKey && fdcApiKey ? 'Totalmente Conectado' : 
               apiKey ? 'IA OpenAI' : 
               fdcApiKey ? 'FoodData' : 'Desconectado'}
            </span>
          </div>
        </div>
      </div>

      <div className="pb-20">
        {renderScreen()}
      </div>

      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200">
        <div className="grid grid-cols-4 h-16">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'home' ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <Home size={18} />
            <span className="text-xs">Inicio</span>
          </button>
          <button
            onClick={() => setActiveTab('nutrition')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'nutrition' ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <Utensils size={18} />
            <span className="text-xs">Nutrición</span>
          </button>
          <button
            onClick={() => setActiveTab('workouts')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'workouts' ? 'text-purple-600' : 'text-gray-400'
            }`}
          >
            <Dumbbell size={18} />
            <span className="text-xs">Entrenamientos</span>
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'assistant' ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <MessageCircle size={18} />
            <span className="text-xs">Asistente</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FitAIApp;