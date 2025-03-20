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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../firebaseConfig';
import { ref, push, set, get } from 'firebase/database';

// Define the API key directly in the component
const ANTHROPIC_API_KEY = ""; // Replace with your actual API key
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const ChatbotScreen = ({ navigateTo }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userPhone, setUserPhone] = useState('');
  const flatListRef = useRef(null);

  // Default welcome message from assistant
  const welcomeMessage = {
    id: 'welcome',
    text: "Hi there! I'm your AI mental health assistant. How are you feeling today?",
    sender: 'assistant',
    timestamp: new Date().toISOString()
  };

  useEffect(() => {
    // Load user data and chat history
    const loadUserData = async () => {
      try {
        const storedPhone = await AsyncStorage.getItem('userPhone');
        if (storedPhone) {
          setUserPhone(storedPhone);
          loadChatHistory(storedPhone);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  const loadChatHistory = async (phone) => {
    try {
      const chatRef = ref(database, `SmartMentalHealthApplication/users/${phone}/chats`);
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
      const chatRef = ref(database, `SmartMentalHealthApplication/users/${userPhone}/chats`);
      const newMessageRef = push(chatRef);
      await set(newMessageRef, {
        ...message,
        id: newMessageRef.key
      });
    } catch (error) {
      console.error('Error saving message to Firebase:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    Keyboard.dismiss();
    
    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
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
          system: "You are a helpful mental health assistant that provides supportive, empathetic responses. You're part of a mental health app and should help users with emotional support, stress management tips, and general mental wellness advice. Never diagnose medical conditions or replace professional help. Always encourage seeking professional help for serious issues. Keep responses supportive, practical, and concise."
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
            <Text style={styles.avatarText}>🤖</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#2196F3', '#1565C0']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigateTo('dashboard')}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Chatbot</Text>
        </View>
      </LinearGradient>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={item => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesListContent}
          onLayout={() => flatListRef.current?.scrollToEnd({animated: true})}
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor="#888"
            multiline
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.disabledSendButton
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
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
    backgroundColor: '#1565C0',
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
    backgroundColor: '#1565C0',
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
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ChatbotScreen;