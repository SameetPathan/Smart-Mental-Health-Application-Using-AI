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
  Image,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../firebaseConfig';
import { ref, push, set, get, onValue, update, serverTimestamp } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const TherapistConsultationScreen = ({ navigateTo }) => {
  const [userPhone, setUserPhone] = useState('');
  const [userName, setUserName] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [therapists, setTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [showTherapistModal, setShowTherapistModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [lastMessageTimes, setLastMessageTimes] = useState({});
  const flatListRef = useRef(null);

  // Load user data when component mounts
  useEffect(() => {
    loadUserData();
  }, []);

  // Fetch therapists when user data is loaded
  useEffect(() => {
    if (userPhone) {
      fetchTherapists();
      const messagesRef = ref(database, `SmartMentalHealthApplication/messages`);
      const unsubscribe = onValue(messagesRef, (snapshot) => {
        if (snapshot.exists()) {
          processMessages(snapshot.val());
        }
      });

      // Cleanup listener on unmount
      return () => unsubscribe();
    }
  }, [userPhone]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Load messages when a therapist is selected
  useEffect(() => {
    if (selectedTherapist) {
      loadMessages(selectedTherapist.id);
      setShowTherapistModal(false);
    }
  }, [selectedTherapist]);

  const loadUserData = async () => {
    try {
      const storedPhone = await AsyncStorage.getItem('userPhone');
      if (storedPhone) {
        setUserPhone(storedPhone);
        
        // Get user name from database
        const userRef = ref(database, `SmartMentalHealthApplication/users/${storedPhone}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUserName(userData.username || 'User');
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTherapists = async () => {
    try {
      const therapistsRef = ref(database, 'SmartMentalHealthApplication/therapists');
      const snapshot = await get(therapistsRef);
      
      if (snapshot.exists()) {
        const therapistData = snapshot.val();
        const therapistList = Object.keys(therapistData).map(id => ({
          id,
          ...therapistData[id]
        }));
        
        setTherapists(therapistList);
        
        // Check if there's an active conversation and set that therapist
        const activeTherapistId = await getActiveTherapistId();
        if (activeTherapistId) {
          const activeTherapist = therapistList.find(therapist => therapist.id === activeTherapistId);
          if (activeTherapist) {
            setSelectedTherapist(activeTherapist);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching therapists:', error);
    }
  };

  const getActiveTherapistId = async () => {
    try {
      const userChatsRef = ref(database, `SmartMentalHealthApplication/userChats/${userPhone}`);
      const snapshot = await get(userChatsRef);
      
      if (snapshot.exists()) {
        const chatData = snapshot.val();
        const chatIds = Object.keys(chatData);
        
        if (chatIds.length > 0) {
          // Return the most recent chat's therapist ID
          return chatData[chatIds[0]].therapistId;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting active therapist:', error);
      return null;
    }
  };

  const processMessages = (allMessages) => {
    if (!userPhone) return;

    const newUnreadMessages = {};
    const newLastMessageTimes = {};
    
    // Process all messages to count unread ones for each therapist
    Object.entries(allMessages).forEach(([chatId, chatMessages]) => {
      if (chatMessages.user === userPhone) {
        const therapistId = chatMessages.therapist;
        let unreadCount = 0;
        let lastMessageTime = 0;
        
        // Count unread messages from therapist
        Object.values(chatMessages.messages || {}).forEach(message => {
          if (message.sender === 'therapist' && !message.readByUser) {
            unreadCount++;
          }
          
          // Track the most recent message timestamp
          if (message.timestamp && message.timestamp > lastMessageTime) {
            lastMessageTime = message.timestamp;
          }
        });
        
        newUnreadMessages[therapistId] = unreadCount;
        newLastMessageTimes[therapistId] = lastMessageTime;
      }
    });
    
    setUnreadMessages(newUnreadMessages);
    setLastMessageTimes(newLastMessageTimes);
  };

  const loadMessages = async (therapistId) => {
    if (!userPhone || !therapistId) return;
    
    try {
      const chatId = `${userPhone}_${therapistId}`;
      const messagesRef = ref(database, `SmartMentalHealthApplication/messages/${chatId}/messages`);
      const snapshot = await get(messagesRef);
      
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        const messageList = Object.keys(messagesData).map(key => ({
          id: key,
          ...messagesData[key]
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        setMessages(messageList);
        
        // Mark all therapist messages as read
        Object.entries(messagesData).forEach(([key, message]) => {
          if (message.sender === 'therapist' && !message.readByUser) {
            const messageRef = ref(database, `SmartMentalHealthApplication/messages/${chatId}/messages/${key}`);
            update(messageRef, { readByUser: true });
          }
        });
        
        // Update unread messages count
        setUnreadMessages({
          ...unreadMessages,
          [therapistId]: 0
        });
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedTherapist || !userPhone) return;
    
    try {
      setIsSending(true);
      const chatId = `${userPhone}_${selectedTherapist.id}`;
      
      // Create message object
      const newMessage = {
        text: inputText.trim(),
        sender: 'user',
        senderName: userName,
        timestamp: Date.now(),
        readByTherapist: false,
        readByUser: true
      };
      
      // Add message to database
      const messagesRef = ref(database, `SmartMentalHealthApplication/messages/${chatId}/messages`);
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, newMessage);
      
      // Update chat metadata
      const chatRef = ref(database, `SmartMentalHealthApplication/messages/${chatId}`);
      await update(chatRef, {
        user: userPhone,
        therapist: selectedTherapist.id,
        lastMessage: inputText.trim(),
        lastMessageTime: Date.now(),
        lastMessageSender: 'user'
      });
      
      // Update user chats
      const userChatsRef = ref(database, `SmartMentalHealthApplication/userChats/${userPhone}/${chatId}`);
      await set(userChatsRef, {
        therapistId: selectedTherapist.id,
        therapistName: selectedTherapist.name,
        lastMessage: inputText.trim(),
        lastMessageTime: Date.now()
      });
      
      // Update therapist chats
      const therapistChatsRef = ref(database, `SmartMentalHealthApplication/therapistChats/${selectedTherapist.id}/${chatId}`);
      await set(therapistChatsRef, {
        userId: userPhone,
        userName: userName,
        lastMessage: inputText.trim(),
        lastMessageTime: Date.now(),
        unread: true
      });
      
      // Clear input
      setInputText('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const startNewConsultation = async (therapist) => {
    setSelectedTherapist(therapist);
    
    // If there are no existing messages, create a welcome message
    const chatId = `${userPhone}_${therapist.id}`;
    const messagesRef = ref(database, `SmartMentalHealthApplication/messages/${chatId}/messages`);
    const snapshot = await get(messagesRef);
    
    if (!snapshot.exists()) {
      // Add welcome message from therapist
      const welcomeMessage = {
        text: `Hello! I'm ${therapist.name}. How can I help you today?`,
        sender: 'therapist',
        senderName: therapist.name,
        timestamp: Date.now(),
        readByTherapist: true,
        readByUser: true
      };
      
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, welcomeMessage);
      
      // Update chat metadata
      const chatRef = ref(database, `SmartMentalHealthApplication/messages/${chatId}`);
      await set(chatRef, {
        user: userPhone,
        therapist: therapist.id,
        lastMessage: welcomeMessage.text,
        lastMessageTime: Date.now(),
        lastMessageSender: 'therapist'
      });
      
      // Update user chats
      const userChatsRef = ref(database, `SmartMentalHealthApplication/userChats/${userPhone}/${chatId}`);
      await set(userChatsRef, {
        therapistId: therapist.id,
        therapistName: therapist.name,
        lastMessage: welcomeMessage.text,
        lastMessageTime: Date.now()
      });
      
      // Update therapist chats
      const therapistChatsRef = ref(database, `SmartMentalHealthApplication/therapistChats/${therapist.id}/${chatId}`);
      await set(therapistChatsRef, {
        userId: userPhone,
        userName: userName,
        lastMessage: welcomeMessage.text,
        lastMessageTime: Date.now(),
        unread: false
      });
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const renderMessageItem = ({ item, index }) => {
    const isUser = item.sender === 'user';
    const showDateHeader = index === 0 || (index > 0 && 
      formatDate(item.timestamp) !== formatDate(messages[index - 1].timestamp));
    
    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>{formatDate(item.timestamp)}</Text>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.therapistMessageContainer
        ]}>
          {!isUser && (
            <View style={styles.avatarContainer}>
              <Icon name="doctor" size={20} color="#fff" />
            </View>
          )}
          
          <View style={[
            styles.messageBubble,
            isUser ? styles.userMessageBubble : styles.therapistMessageBubble
          ]}>
            <Text style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.therapistMessageText
            ]}>
              {item.text}
            </Text>
            <Text style={styles.timestampText}>
              {formatTime(item.timestamp)}
            </Text>
          </View>
          
          {isUser && (
            <View style={styles.avatarContainer}>
              <Icon name="account" size={20} color="#fff" />
            </View>
          )}
        </View>
      </>
    );
  };

  const renderTherapistOption = (therapist) => {
    const hasUnread = unreadMessages[therapist.id] > 0;
    const lastActivity = lastMessageTimes[therapist.id] 
      ? new Date(lastMessageTimes[therapist.id]).toLocaleDateString()
      : 'No messages yet';
    
    return (
      <TouchableOpacity
        style={styles.therapistOption}
        onPress={() => startNewConsultation(therapist)}
      >
        <View style={styles.therapistAvatarContainer}>
          <Icon name="doctor" size={24} color="#fff" />
        </View>
        
        <View style={styles.therapistInfo}>
          <Text style={styles.therapistName}>{therapist.name}</Text>
          <Text style={styles.therapistSpecialty}>{therapist.specialty || 'General Mental Health'}</Text>
          <Text style={styles.therapistLastActive}>Last activity: {lastActivity}</Text>
        </View>
        
        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadMessages[therapist.id]}</Text>
          </View>
        )}
        
        <Icon name="chevron-right" size={24} color="#9C27B0" />
      </TouchableOpacity>
    );
  };

  const renderTherapistSelectionModal = () => (
    <Modal
      visible={showTherapistModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowTherapistModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select a Therapist</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowTherapistModal(false)}
            >
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalSubtitle}>
            Choose a therapist to start or continue your consultation
          </Text>
          
          {therapists.length > 0 ? (
            <FlatList
              data={therapists}
              renderItem={({ item }) => renderTherapistOption(item)}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.therapistList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.noTherapistsContainer}>
              <Icon name="alert" size={40} color="#9C27B0" />
              <Text style={styles.noTherapistsText}>
                No therapists are available at the moment. Please check back later.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#9C27B0', '#6A1B9A']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigateTo('dashboard')}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Therapist Consultation</Text>
          </View>
        </LinearGradient>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9C27B0" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#9C27B0', '#6A1B9A']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigateTo('dashboard')}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Therapist Consultation</Text>
        </View>
      </LinearGradient>
      
      {selectedTherapist ? (
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.chatContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity
              style={styles.changeTherapistButton}
              onPress={() => setShowTherapistModal(true)}
            >
              <Icon name="account-switch" size={20} color="#9C27B0" />
              <Text style={styles.changeTherapistText}>Change</Text>
            </TouchableOpacity>
            
            <View style={styles.therapistInfoHeader}>
              <Text style={styles.therapistNameHeader}>{selectedTherapist.name}</Text>
              <Text style={styles.therapistStatusHeader}>
                {selectedTherapist.status === 'online' ? 'Online' : 'Offline'}
              </Text>
            </View>
            
            <View style={[
              styles.statusIndicator,
              selectedTherapist.status === 'online' ? styles.onlineIndicator : styles.offlineIndicator
            ]} />
          </View>
          
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            onLayout={() => flatListRef.current?.scrollToEnd({animated: true})}
          />
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              placeholderTextColor="#999"
              multiline
            />
            
            <TouchableOpacity 
              style={[
                styles.sendButton,
                (!inputText.trim() || isSending) && styles.disabledSendButton
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="send" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.emptyStateContainer}>
          <Image
            source={require('../assets/health-suggestions.png')}
            style={styles.emptyStateImage}
            defaultSource={require('../assets/health-suggestions.png')}
          />
          
          <Text style={styles.emptyStateTitle}>
            Connect with a Professional
          </Text>
          
          <Text style={styles.emptyStateText}>
            Our licensed therapists are here to provide guidance, support, and professional insight. 
            Start a consultation to discuss your concerns in a safe, confidential environment.
          </Text>
          
          <TouchableOpacity
            style={styles.startConsultationButton}
            onPress={() => setShowTherapistModal(true)}
          >
            <Text style={styles.startConsultationButtonText}>
              Start Consultation
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {renderTherapistSelectionModal()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  changeTherapistButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeTherapistText: {
    fontSize: 14,
    color: '#9C27B0',
    marginLeft: 5,
  },
  therapistInfoHeader: {
    alignItems: 'center',
  },
  therapistNameHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  therapistStatusHeader: {
    fontSize: 12,
    color: '#666',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  onlineIndicator: {
    backgroundColor: '#4CAF50',
  },
  offlineIndicator: {
    backgroundColor: '#9E9E9E',
  },
  messagesList: {
    padding: 15,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  therapistMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
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
    backgroundColor: '#9C27B0',
    borderBottomRightRadius: 4,
  },
  therapistMessageBubble: {
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
  therapistMessageText: {
    color: '#333',
  },
  timestampText: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.5)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateHeaderText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
    backgroundColor: '#9C27B0',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  disabledSendButton: {
    backgroundColor: '#D1C4E9',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateImage: {
    width: 150,
    height: 150,
    marginBottom: 25,
    resizeMode: 'contain',
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  startConsultationButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  startConsultationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  closeButton: {
    padding: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  therapistList: {
    paddingBottom: 20,
  },
  therapistOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  therapistAvatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  therapistInfo: {
    flex: 1,
  },
  therapistName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  therapistSpecialty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  therapistLastActive: {
    fontSize: 12,
    color: '#999',
  },
  unreadBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noTherapistsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noTherapistsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
  },
});

export default TherapistConsultationScreen;