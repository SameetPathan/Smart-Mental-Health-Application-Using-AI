import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../firebaseConfig';
import { ref, push, set, get } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Define the API key directly in the component
const ANTHROPIC_API_KEY = ""; // Replace with your actual API key
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const HealthSuggestionsScreen = ({ navigateTo }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userPhone, setUserPhone] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [healthProfile, setHealthProfile] = useState(null);
  const flatListRef = useRef(null);

  // Default welcome message from assistant
  const welcomeMessage = {
    id: 'welcome',
    text: "Hi there! I'm your personal health advisor. I can suggest exercises, diet plans, and wellness tips personalized for you. What would you like help with today?",
    sender: 'assistant',
    timestamp: new Date().toISOString()
  };

  // Predefined suggestion categories
  const suggestionCategories = [
    {
      id: 'exercise',
      title: 'Exercise Routines',
      icon: 'run',
      color: '#8BC34A',
      questions: [
        "What are some quick exercises I can do at home?",
        "Can you suggest a 10-minute workout for beginners?",
        "What exercises help with reducing stress?",
        "How can I improve my posture with exercise?",
        "What's a good exercise routine to start my day?"
      ]
    },
    {
      id: 'diet',
      title: 'Diet & Nutrition',
      icon: 'food-apple',
      color: '#FF9800',
      questions: [
        "What foods boost mood and mental health?",
        "What should I eat to improve sleep quality?",
        "Can you suggest healthy snacks for work?",
        "What's a balanced breakfast look like?",
        "How can I reduce sugar cravings?"
      ]
    },
    {
      id: 'mind',
      title: 'Mental Wellness',
      icon: 'brain',
      color: '#9C27B0',
      questions: [
        "How does exercise benefit mental health?",
        "What foods help with brain function?",
        "What lifestyle changes can boost my mood?",
        "How can I add mindfulness to my exercise routine?",
        "What exercises help with anxiety reduction?"
      ]
    },
    {
      id: 'sleep',
      title: 'Sleep Improvement',
      icon: 'sleep',
      color: '#3F51B5',
      questions: [
        "What exercises help with better sleep?",
        "What foods should I avoid before bedtime?",
        "How can I create a healthy sleep routine?",
        "What stretches can help me relax before bed?",
        "How does diet affect sleep quality?"
      ]
    }
  ];

  useEffect(() => {
    // Load user data and chat history
    const loadUserData = async () => {
      try {
        const storedPhone = await AsyncStorage.getItem('userPhone');
        if (storedPhone) {
          setUserPhone(storedPhone);
          loadChatHistory(storedPhone);
          loadHealthProfile(storedPhone);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  const loadHealthProfile = async (phone) => {
    try {
      const profileRef = ref(database, `SmartMentalHealthApplication/users/${phone}`);
      const snapshot = await get(profileRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setHealthProfile({
          age: userData.health?.age || 'Unknown',
          gender: userData.health?.gender || 'Unknown',
          height: userData.health?.height || 'Unknown',
          weight: userData.health?.weight || 'Unknown',
          goals: userData.health?.goals || [],
          dietaryRestrictions: userData.health?.dietaryRestrictions || []
        });
      }
    } catch (error) {
      console.error('Error loading health profile:', error);
    }
  };

  const loadChatHistory = async (phone) => {
    try {
      const chatRef = ref(database, `SmartMentalHealthApplication/users/${phone}/healthChats`);
      const snapshot = await get(chatRef);
      
      if (snapshot.exists()) {
        const chatData = snapshot.val();
        const chatMessages = Object.values(chatData).sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        setMessages(chatMessages);
      } else {
        // If no chat history, set the welcome message
        setMessages([welcomeMessage]);
        // Save welcome message to Firebase
        saveMessageToFirebase(welcomeMessage);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([welcomeMessage]);
    }
  };

  const saveMessageToFirebase = async (message) => {
    if (!userPhone) return;
    
    try {
      const chatRef = ref(database, `SmartMentalHealthApplication/users/${userPhone}/healthChats`);
      const newMessageRef = push(chatRef);
      await set(newMessageRef, {
        ...message,
        id: newMessageRef.key
      });
    } catch (error) {
      console.error('Error saving message to Firebase:', error);
    }
  };

  const sendMessage = async (text = inputText) => {
    const messageText = text.trim() || inputText.trim();
    if (!messageText) return;
    
    Keyboard.dismiss();
    setShowSuggestions(false);
    
    const userMessage = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    // Update UI immediately with user message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);
    
    // Save user message to Firebase
    await saveMessageToFirebase(userMessage);
    
    try {
      // Create context from recent messages (last 10)
      const recentMessages = updatedMessages.slice(-10).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));
      
      // Prepare health profile information
      let systemPrompt = "You are a knowledgeable health advisor that provides personalized exercise routines, diet recommendations, and wellness tips. " +
                         "Focus on practical, evidence-based advice that promotes both physical and mental wellbeing. " +
                         "Always consider safety first and avoid anything that could be harmful. " +
                         "Tailor your suggestions to be realistic and sustainable. " +
                         "Always encourage consulting healthcare professionals before starting new exercise regimens or making significant dietary changes.";
      
      // Add health profile information if available
      if (healthProfile) {
        systemPrompt += `\n\nUser's health profile (consider this when giving advice):`;
        if (healthProfile.age !== 'Unknown') systemPrompt += `\n- Age: ${healthProfile.age}`;
        if (healthProfile.gender !== 'Unknown') systemPrompt += `\n- Gender: ${healthProfile.gender}`;
        if (healthProfile.height !== 'Unknown') systemPrompt += `\n- Height: ${healthProfile.height}`;
        if (healthProfile.weight !== 'Unknown') systemPrompt += `\n- Weight: ${healthProfile.weight}`;
        if (healthProfile.goals && healthProfile.goals.length > 0) {
          systemPrompt += `\n- Goals: ${healthProfile.goals.join(', ')}`;
        }
        if (healthProfile.dietaryRestrictions && healthProfile.dietaryRestrictions.length > 0) {
          systemPrompt += `\n- Dietary restrictions: ${healthProfile.dietaryRestrictions.join(', ')}`;
        }
      }
      
      // Call Anthropic API
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01', // Use the latest API version
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229', // You can change to other models as needed
          max_tokens: 1000,
          messages: recentMessages,
          system: systemPrompt
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Extract the assistant's response
      const assistantMessage = {
        id: Date.now().toString() + 1,
        text: responseData.content[0].text,
        sender: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      // Update messages with assistant's response
      setMessages([...updatedMessages, assistantMessage]);
      
      // Save assistant message to Firebase
      await saveMessageToFirebase(assistantMessage);
      
    } catch (error) {
      console.error('Error calling Anthropic API:', error);
      
      // Send fallback message if API call fails
      const fallbackMessage = {
        id: Date.now().toString() + 1,
        text: "I'm sorry, I'm having trouble connecting. Please try again in a moment.",
        sender: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      setMessages([...updatedMessages, fallbackMessage]);
      await saveMessageToFirebase(fallbackMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const renderMessageItem = ({ item }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.assistantMessageContainer
      ]}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>💪</Text>
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isUser ? styles.userMessageBubble : styles.assistantMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.assistantMessageText
          ]}>
            {item.text}
          </Text>
          <Text style={styles.timestampText}>
            {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
        </View>
        
        {isUser && (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}
      </View>
    );
  };

  const renderSuggestionCategory = ({ item }) => (
    <TouchableOpacity 
      style={[styles.categoryCard, { borderColor: item.color }]}
      onPress={() => setShowSuggestions(item.id)}
    >
      <View style={[styles.categoryIconContainer, { backgroundColor: item.color }]}>
        <Icon name={item.icon} size={28} color="#FFF" />
      </View>
      <Text style={styles.categoryTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderSuggestedQuestions = () => {
    // Show all categories initially
    if (showSuggestions === true) {
      return (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>How can I help you today?</Text>
          <FlatList
            data={suggestionCategories}
            renderItem={renderSuggestionCategory}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          />
          
          {healthProfile ? (
            <View style={styles.profileContainer}>
              <Text style={styles.profileTitle}>Your Health Profile</Text>
              <View style={styles.profileDetails}>
                {healthProfile.age !== 'Unknown' && (
                  <View style={styles.profileItem}>
                    <Icon name="calendar" size={18} color="#8BC34A" />
                    <Text style={styles.profileItemText}>{healthProfile.age} years</Text>
                  </View>
                )}
                {healthProfile.weight !== 'Unknown' && (
                  <View style={styles.profileItem}>
                    <Icon name="weight" size={18} color="#8BC34A" />
                    <Text style={styles.profileItemText}>{healthProfile.weight}</Text>
                  </View>
                )}
                {healthProfile.height !== 'Unknown' && (
                  <View style={styles.profileItem}>
                    <Icon name="human-male-height" size={18} color="#8BC34A" />
                    <Text style={styles.profileItemText}>{healthProfile.height}</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.setupProfileButton}
              onPress={() => navigateTo('profile')}
            >
              <Text style={styles.setupProfileText}>
                Set up your health profile for personalized recommendations
              </Text>
              <Icon name="chevron-right" size={20} color="#8BC34A" />
            </TouchableOpacity>
          )}
        </View>
      );
    }
    
    // Show category-specific questions
    const category = suggestionCategories.find(cat => cat.id === showSuggestions);
    if (!category) return null;
    
    return (
      <View style={styles.suggestionsContainer}>
        <View style={styles.suggestionsHeader}>
          <TouchableOpacity 
            style={styles.backToCategories}
            onPress={() => setShowSuggestions(true)}
          >
            <Icon name="chevron-left" size={20} color="#8BC34A" />
            <Text style={styles.backToCategoriesText}>Categories</Text>
          </TouchableOpacity>
          <Text style={styles.suggestionsTitle}>{category.title}</Text>
        </View>
        <View style={styles.questionsList}>
          {category.questions.map((question, index) => (
            <TouchableOpacity
              key={index}
              style={styles.questionButton}
              onPress={() => sendMessage(question)}
            >
              <Text style={styles.questionText}>{question}</Text>
              <Icon name="send" size={18} color="#8BC34A" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#8BC34A', '#558B2F']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigateTo('dashboard')}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Suggestions</Text>
        </View>
      </LinearGradient>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Image
              source={require('../assets/health-suggestions.svg')}
              style={styles.emptyStateImage}
              defaultSource={require('../assets/health-suggestions.svg')}
            />
            <Text style={styles.emptyStateTitle}>Your Personal Health Advisor</Text>
            <Text style={styles.emptyStateText}>
              Get personalized exercise routines, diet recommendations, and wellness tips to improve your physical and mental health.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={item => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesListContent}
            onLayout={() => flatListRef.current?.scrollToEnd({animated: true})}
          />
        )}
        
        {showSuggestions !== false && renderSuggestedQuestions()}
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about exercise, diet, or wellness..."
            placeholderTextColor="#888"
            multiline
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.disabledSendButton
            ]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Icon name="send" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    padding: 15,
  },
  messagesListContent: {
    paddingBottom: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  avatarText: {
    fontSize: 18,
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 20,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  userMessageBubble: {
    backgroundColor: '#8BC34A',
    borderBottomRightRadius: 4,
  },
  assistantMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#333',
  },
  timestampText: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.5)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#8BC34A',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  disabledSendButton: {
    backgroundColor: '#b0bec5',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#558B2F',
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#558B2F',
    marginBottom: 15,
  },
  categoriesContainer: {
    paddingBottom: 10,
  },
  categoryCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginRight: 12,
    borderWidth: 2,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  categoryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  profileContainer: {
    marginTop: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  profileTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#558B2F',
    marginBottom: 10,
  },
  profileDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  profileItemText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 5,
  },
  setupProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    backgroundColor: 'rgba(139, 195, 74, 0.1)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8BC34A',
  },
  setupProfileText: {
    fontSize: 14,
    color: '#558B2F',
    flex: 1,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  backToCategories: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  backToCategoriesText: {
    fontSize: 14,
    color: '#8BC34A',
  },
  questionsList: {
    marginBottom: 10,
  },
  questionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 195, 74, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.3)',
  },
  questionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 10,
  }
});

export default HealthSuggestionsScreen;