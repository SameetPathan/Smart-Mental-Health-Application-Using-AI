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
  Switch,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../firebaseConfig';
import { ref, push, set, get, onValue, update, remove } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const TherapistAdminScreen = ({ navigateTo }) => {
  const [therapistId, setTherapistId] = useState('');
  const [therapistData, setTherapistData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [inputText, setInputText] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showClientInfoModal, setShowClientInfoModal] = useState(false);
  const [clientInfo, setClientInfo] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [stats, setStats] = useState({
    totalClients: 0,
    activeChats: 0,
    unreadMessages: 0,
    messagesThisWeek: 0,
  });
  const flatListRef = useRef(null);

  // Load therapist data when component mounts
  useEffect(() => {
    loadTherapistData();
  }, []);

  // Setup realtime listeners when therapist data is loaded
  useEffect(() => {
    if (therapistId) {
      setupListeners();
      updateOnlineStatus(isOnline);
    }
  }, [therapistId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Load messages when a client is selected
  useEffect(() => {
    if (selectedClient) {
      loadMessages(selectedClient.userId);
      updateClientNotes(selectedClient.userId);
    }
  }, [selectedClient]);

  const loadTherapistData = async () => {
    try {
      const storedPhone = await AsyncStorage.getItem('userPhone');
      if (storedPhone) {
        // Find therapist by phone number
        const therapistsRef = ref(database, 'SmartMentalHealthApplication/therapists');
        const snapshot = await get(therapistsRef);
        
        if (snapshot.exists()) {
          const therapistsData = snapshot.val();
          
          // Find the therapist with matching phone
          let foundTherapistId = null;
          let foundTherapist = null;
          
          Object.entries(therapistsData).forEach(([id, data]) => {
            if (data.phone === storedPhone) {
              foundTherapistId = id;
              foundTherapist = data;
            }
          });
          
          if (foundTherapistId && foundTherapist) {
            setTherapistId(foundTherapistId);
            setTherapistData(foundTherapist);
            setIsOnline(foundTherapist.status === 'online');
          } else {
            // Create new therapist profile if not found
            await createTherapistProfile(storedPhone);
          }
        } else {
          // Create new therapist profile if none exist
          await createTherapistProfile(storedPhone);
        }
      }
    } catch (error) {
      console.error('Error loading therapist data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createTherapistProfile = async (phone) => {
    try {
      // Get user data to use for therapist profile
      const userRef = ref(database, `SmartMentalHealthApplication/users/${phone}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        // Create new therapist entry
        const therapistsRef = ref(database, 'SmartMentalHealthApplication/therapists');
        const newTherapistRef = push(therapistsRef);
        
        const newTherapist = {
          name: userData.username || 'Dr. ' + phone.substring(0, 4),
          phone: phone,
          status: 'online',
          specialty: 'General Mental Health',
          bio: 'Licensed Mental Health Professional',
          rating: 5.0,
          createdAt: Date.now()
        };
        
        await set(newTherapistRef, newTherapist);
        
        setTherapistId(newTherapistRef.key);
        setTherapistData(newTherapist);
      }
    } catch (error) {
      console.error('Error creating therapist profile:', error);
    }
  };

  const setupListeners = () => {
    // Listen for changes in therapist chats
    const therapistChatsRef = ref(database, `SmartMentalHealthApplication/therapistChats/${therapistId}`);
    onValue(therapistChatsRef, (snapshot) => {
      if (snapshot.exists()) {
        const chatsData = snapshot.val();
        processClients(chatsData);
      } else {
        setClients([]);
      }
    });
    
    // Listen for all messages to count stats
    const messagesRef = ref(database, 'SmartMentalHealthApplication/messages');
    onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        calculateStats(messagesData);
      }
    });
  };

  const processClients = async (chatsData) => {
    try {
      const clientsList = [];
      const usersToFetch = Object.keys(chatsData).map(chatId => chatsData[chatId].userId);
      
      // Fetch user data for all clients
      for (const userId of usersToFetch) {
        const userRef = ref(database, `SmartMentalHealthApplication/users/${userId}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          
          // Find chat data for this user
          const chatId = Object.keys(chatsData).find(id => chatsData[id].userId === userId);
          const chatData = chatsData[chatId];
          
          clientsList.push({
            userId,
            chatId,
            name: userData.username || 'User',
            lastMessage: chatData.lastMessage,
            lastMessageTime: chatData.lastMessageTime,
            unread: chatData.unread || false,
            assessment: userData.assessment || {},
            profile: userData.profile || {},
            notes: chatData.notes || ''
          });
        }
      }
      
      // Sort by last message time (newest first)
      clientsList.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
      
      setClients(clientsList);
      
      // If we have a selected client, update their data
      if (selectedClient) {
        const updatedClient = clientsList.find(client => client.userId === selectedClient.userId);
        if (updatedClient) {
          setSelectedClient(updatedClient);
        }
      }
    } catch (error) {
      console.error('Error processing clients:', error);
    }
  };

  const calculateStats = (messagesData) => {
    try {
      let activeChats = 0;
      let unreadMessages = 0;
      let messagesThisWeek = 0;
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const clientIds = new Set();
      
      Object.entries(messagesData).forEach(([chatId, chatData]) => {
        if (chatData.therapist === therapistId) {
          // Count unique clients
          clientIds.add(chatData.user);
          
          // Count active chats (had message in last 7 days)
          if (chatData.lastMessageTime && chatData.lastMessageTime > oneWeekAgo) {
            activeChats++;
          }
          
          // Count unread messages
          Object.values(chatData.messages || {}).forEach(message => {
            if (message.sender === 'user' && !message.readByTherapist) {
              unreadMessages++;
            }
            
            // Count messages this week
            if (message.timestamp > oneWeekAgo) {
              messagesThisWeek++;
            }
          });
        }
      });
      
      setStats({
        totalClients: clientIds.size,
        activeChats,
        unreadMessages,
        messagesThisWeek
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const updateOnlineStatus = async (status) => {
    try {
      const newStatus = status ? 'online' : 'offline';
      const therapistRef = ref(database, `SmartMentalHealthApplication/therapists/${therapistId}`);
      await update(therapistRef, { status: newStatus });
      
      setIsOnline(status);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const loadMessages = async (userId) => {
    if (!userId || !therapistId) return;
    
    try {
      const chatId = `${userId}_${therapistId}`;
      const messagesRef = ref(database, `SmartMentalHealthApplication/messages/${chatId}/messages`);
      const snapshot = await get(messagesRef);
      
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        const messagesList = Object.keys(messagesData).map(key => ({
          id: key,
          ...messagesData[key]
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        setMessages(messagesList);
        
        // Mark all user messages as read
        Object.entries(messagesData).forEach(([key, message]) => {
          if (message.sender === 'user' && !message.readByTherapist) {
            const messageRef = ref(database, `SmartMentalHealthApplication/messages/${chatId}/messages/${key}`);
            update(messageRef, { readByTherapist: true });
          }
        });
        
        // Update unread status in therapist chats
        const therapistChatRef = ref(database, `SmartMentalHealthApplication/therapistChats/${therapistId}/${chatId}`);
        update(therapistChatRef, { unread: false });
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedClient || !therapistId) return;
    
    try {
      setIsSending(true);
      const chatId = `${selectedClient.userId}_${therapistId}`;
      
      // Create message object
      const newMessage = {
        text: inputText.trim(),
        sender: 'therapist',
        senderName: therapistData.name,
        timestamp: Date.now(),
        readByTherapist: true,
        readByUser: false
      };
      
      // Add message to database
      const messagesRef = ref(database, `SmartMentalHealthApplication/messages/${chatId}/messages`);
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, newMessage);
      
      // Update chat metadata
      const chatRef = ref(database, `SmartMentalHealthApplication/messages/${chatId}`);
      await update(chatRef, {
        user: selectedClient.userId,
        therapist: therapistId,
        lastMessage: inputText.trim(),
        lastMessageTime: Date.now(),
        lastMessageSender: 'therapist'
      });
      
      // Update user chats
      const userChatsRef = ref(database, `SmartMentalHealthApplication/userChats/${selectedClient.userId}/${chatId}`);
      await update(userChatsRef, {
        therapistId: therapistId,
        therapistName: therapistData.name,
        lastMessage: inputText.trim(),
        lastMessageTime: Date.now(),
        unread: true
      });
      
      // Update therapist chats
      const therapistChatsRef = ref(database, `SmartMentalHealthApplication/therapistChats/${therapistId}/${chatId}`);
      await update(therapistChatsRef, {
        userId: selectedClient.userId,
        userName: selectedClient.name,
        lastMessage: inputText.trim(),
        lastMessageTime: Date.now(),
        unread: false
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

  const updateClientNotes = async (userId) => {
    try {
      const chatId = `${userId}_${therapistId}`;
      const notesRef = ref(database, `SmartMentalHealthApplication/therapistChats/${therapistId}/${chatId}/notes`);
      const snapshot = await get(notesRef);
      
      if (snapshot.exists()) {
        setNotesText(snapshot.val());
      } else {
        setNotesText('');
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const saveNotes = async () => {
    if (!selectedClient || !therapistId) return;
    
    try {
      const chatId = `${selectedClient.userId}_${therapistId}`;
      const notesRef = ref(database, `SmartMentalHealthApplication/therapistChats/${therapistId}/${chatId}/notes`);
      await set(notesRef, notesText);
      
      setShowNotesModal(false);
      
      // Update selected client object
      setSelectedClient({
        ...selectedClient,
        notes: notesText
      });
    } catch (error) {
      console.error('Error saving notes:', error);
      Alert.alert('Error', 'Failed to save notes. Please try again.');
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
          {isUser && (
            <View style={styles.avatarContainer}>
              <Icon name="account" size={20} color="#fff" />
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
          
          {!isUser && (
            <View style={styles.avatarContainer}>
              <Icon name="doctor" size={20} color="#fff" />
            </View>
          )}
        </View>
      </>
    );
  };

  const renderClientItem = (client, index) => {
    const isSelected = selectedClient && selectedClient.userId === client.userId;
    const lastMessageTime = client.lastMessageTime 
      ? new Date(client.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
      : '';
    
    return (
      <TouchableOpacity
        style={[
          styles.clientItem,
          isSelected && styles.selectedClientItem,
          client.unread && styles.unreadClientItem
        ]}
        onPress={() => setSelectedClient(client)}
      >
        <View style={styles.clientAvatar}>
          <Text style={styles.clientAvatarText}>
            {client.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.clientInfo}>
          <View style={styles.clientNameRow}>
            <Text style={styles.clientName}>{client.name}</Text>
            <Text style={styles.lastMessageTime}>{lastMessageTime}</Text>
          </View>
          
          <Text
            style={[
              styles.lastMessageText,
              client.unread && styles.unreadLastMessageText
            ]}
            numberOfLines={1}
          >
            {client.lastMessage || 'No messages yet'}
          </Text>
        </View>
        
        {client.unread && (
          <View style={styles.unreadDot} />
        )}
      </TouchableOpacity>
    );
  };

  const renderDashboard = () => (
    <ScrollView 
      style={styles.dashboardContainer}
      contentContainerStyle={styles.dashboardContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.dashboardTitle}>Therapist Dashboard</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalClients}</Text>
          <Text style={styles.statLabel}>Total Clients</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.activeChats}</Text>
          <Text style={styles.statLabel}>Active Chats</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.unreadMessages}</Text>
          <Text style={styles.statLabel}>Unread Messages</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.messagesThisWeek}</Text>
          <Text style={styles.statLabel}>Messages This Week</Text>
        </View>
      </View>
      
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>Online Status</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleStateText}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={updateOnlineStatus}
            trackColor={{ false: '#BDBDBD', true: '#B39DDB' }}
            thumbColor={isOnline ? '#9C27B0' : '#F5F5F5'}
          />
        </View>
      </View>
      
      <View style={styles.recentClientsSection}>
        <Text style={styles.sectionTitle}>Recent Clients</Text>
        {clients.length > 0 ? (
          <View>
            {clients.slice(0, 5).map((item, index) => renderClientItem(item, index))}
          </View>
        ) : (
          <Text style={styles.noClientsText}>No clients yet</Text>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.viewAllButton}
        onPress={() => setActiveTab('clients')}
      >
        <Text style={styles.viewAllButtonText}>View All Clients</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderClientList = () => (
    <View style={styles.clientsContainer}>
      <View style={styles.clientsHeader}>
        <Text style={styles.clientsTitle}>All Clients</Text>
        <View style={styles.clientsCounter}>
          <Text style={styles.clientsCountText}>{clients.length}</Text>
        </View>
      </View>
      
      {clients.length > 0 ? (
        <ScrollView 
          style={styles.clientsList}
          contentContainerStyle={styles.clientsListContent}
          showsVerticalScrollIndicator={false}
        >
          {clients.map((item, index) => renderClientItem(item, index))}
        </ScrollView>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.noClientsContainer}
          showsVerticalScrollIndicator={false}
        >
          <Icon name="account-multiple" size={60} color="#E0E0E0" />
          <Text style={styles.noClientsTitle}>No Clients Yet</Text>
          <Text style={styles.noClientsText}>
            When users start consultations with you, they will appear here.
          </Text>
        </ScrollView>
      )}
    </View>
  );

  const renderChat = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.chatContainer}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.chatHeader}>
        <View style={styles.clientInfoHeader}>
          <Text style={styles.clientNameHeader}>{selectedClient.name}</Text>
        </View>
        
        <View style={styles.chatHeaderButtons}>
          <TouchableOpacity
            style={styles.notesButton}
            onPress={() => setShowNotesModal(true)}
          >
            <Icon name="note-text" size={20} color="#9C27B0" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => {
              setClientInfo(selectedClient);
              setShowClientInfoModal(true);
            }}
          >
            <Icon name="information" size={20} color="#9C27B0" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.backToChatList}
            onPress={() => setSelectedClient(null)}
          >
            <Icon name="arrow-left" size={20} color="#9C27B0" />
          </TouchableOpacity>
        </View>
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
  );

  const renderNotesModal = () => (
    <Modal
      visible={showNotesModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowNotesModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.notesModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Client Notes</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowNotesModal(false)}
            >
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.notesDescription}>
            These notes are private and only visible to you. They will not be shared with the client.
          </Text>
          
          <TextInput
            style={styles.notesInput}
            value={notesText}
            onChangeText={setNotesText}
            placeholder="Add your notes about this client here..."
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
          />
          
          <TouchableOpacity
            style={styles.saveNotesButton}
            onPress={saveNotes}
          >
            <Text style={styles.saveNotesButtonText}>Save Notes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderClientInfoModal = () => {
    if (!clientInfo) return null;
    
    const relationshipStatus = clientInfo.profile?.relationshipStatus || 'Not specified';
    const challenges = clientInfo.profile?.mentalHealthChallenges || [];
    const assessmentCompleted = clientInfo.assessment?.completed || false;
    const assessmentResponses = clientInfo.assessment?.responses || {};
    
    return (
      <Modal
        visible={showClientInfoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowClientInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.clientInfoModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Client Information</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowClientInfoModal(false)}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.clientInfoScroll}>
              <View style={styles.clientInfoSection}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name:</Text>
                  <Text style={styles.infoValue}>{clientInfo.name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Relationship Status:</Text>
                  <Text style={styles.infoValue}>{relationshipStatus}</Text>
                </View>
              </View>
              
              <View style={styles.clientInfoSection}>
                <Text style={styles.sectionTitle}>Mental Health Challenges</Text>
                {challenges.length > 0 ? (
                  <View style={styles.challengesList}>
                    {challenges.map((challenge, index) => (
                      <View key={index} style={styles.challengeItem}>
                        <Icon name="check-circle" size={16} color="#9C27B0" />
                        <Text style={styles.challengeText}>{challenge}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noDataText}>No challenges specified</Text>
                )}
              </View>
              
              <View style={styles.clientInfoSection}>
                <Text style={styles.sectionTitle}>Assessment Results</Text>
                {assessmentCompleted ? (
                  <View style={styles.assessmentResults}>
                    {Object.entries(assessmentResponses).map(([questionIndex, answer], index) => (
                      <View key={index} style={styles.assessmentItem}>
                        <Text style={styles.questionIndex}>Question {parseInt(questionIndex) + 1}:</Text>
                        <Text style={styles.answerText}>{answer}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noDataText}>Assessment not completed</Text>
                )}
              </View>
              
              <View style={styles.clientInfoSection}>
                <Text style={styles.sectionTitle}>Therapist Notes</Text>
                {clientInfo.notes ? (
                  <Text style={styles.notesText}>{clientInfo.notes}</Text>
                ) : (
                  <Text style={styles.noDataText}>No notes added yet</Text>
                )}
                <TouchableOpacity
                  style={styles.editNotesButton}
                  onPress={() => {
                    setShowClientInfoModal(false);
                    setShowNotesModal(true);
                  }}
                >
                  <Text style={styles.editNotesButtonText}>Edit Notes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

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
            <Text style={styles.headerTitle}>Therapist Admin</Text>
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
          <Text style={styles.headerTitle}>Therapist Dashboard</Text>
          </View>
        </LinearGradient>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'dashboard' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('dashboard')}
          >
            <Icon 
              name="view-dashboard" 
              size={20} 
              color={activeTab === 'dashboard' ? '#9C27B0' : '#757575'} 
            />
            <Text style={[
              styles.tabButtonText,
              activeTab === 'dashboard' && styles.activeTabButtonText
            ]}>
              Dashboard
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'clients' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('clients')}
          >
            <Icon 
              name="account-multiple" 
              size={20} 
              color={activeTab === 'clients' ? '#9C27B0' : '#757575'} 
            />
            <Text style={[
              styles.tabButtonText,
              activeTab === 'clients' && styles.activeTabButtonText
            ]}>
              Clients
            </Text>
            {stats.unreadMessages > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{stats.unreadMessages}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'profile' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('profile')}
          >
            <Icon 
              name="account-cog" 
              size={20} 
              color={activeTab === 'profile' ? '#9C27B0' : '#757575'} 
            />
            <Text style={[
              styles.tabButtonText,
              activeTab === 'profile' && styles.activeTabButtonText
            ]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.contentContainer}>
          {selectedClient ? (
            renderChat()
          ) : (
            <>
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'clients' && renderClientList()}
              {activeTab === 'profile' && (
                <ScrollView 
                  style={styles.profileContainer}
                  contentContainerStyle={styles.profileContentContainer}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.profileHeader}>
                    <View style={styles.therapistAvatarLarge}>
                      <Icon name="doctor" size={50} color="#fff" />
                    </View>
                    <Text style={styles.therapistName}>{therapistData?.name || 'Therapist'}</Text>
                    <Text style={styles.therapistSpecialty}>{therapistData?.specialty || 'General Mental Health'}</Text>
                    
                    <View style={styles.statusRow}>
                      <View style={[
                        styles.statusDot,
                        isOnline ? styles.onlineDot : styles.offlineDot
                      ]} />
                      <Text style={styles.statusText}>
                        {isOnline ? 'Online' : 'Offline'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.profileSection}>
                    <Text style={styles.sectionTitle}>Professional Bio</Text>
                    <Text style={styles.bioText}>
                      {therapistData?.bio || 'Licensed Mental Health Professional with experience helping clients overcome anxiety, depression, and relationship challenges.'}
                    </Text>
                  </View>
                  
                  <View style={styles.profileSection}>
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                    <View style={styles.contactItem}>
                      <Icon name="phone" size={20} color="#9C27B0" />
                      <Text style={styles.contactText}>{therapistData?.phone || 'Not available'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.profileSection}>
                    <Text style={styles.sectionTitle}>Professional Experience</Text>
                    <Text style={styles.bioText}>
                      Over 5 years of experience in mental health counseling, specializing in cognitive behavioral therapy, mindfulness techniques, and trauma-informed care.
                    </Text>
                  </View>
                  
                  <View style={styles.profileSection}>
                    <Text style={styles.sectionTitle}>Education & Certifications</Text>
                    <View style={styles.educationItem}>
                      <Icon name="school" size={18} color="#9C27B0" style={styles.educationIcon} />
                      <Text style={styles.educationText}>Master's in Clinical Psychology</Text>
                    </View>
                    <View style={styles.educationItem}>
                      <Icon name="certificate" size={18} color="#9C27B0" style={styles.educationIcon} />
                      <Text style={styles.educationText}>Licensed Professional Counselor</Text>
                    </View>
                    <View style={styles.educationItem}>
                      <Icon name="certificate" size={18} color="#9C27B0" style={styles.educationIcon} />
                      <Text style={styles.educationText}>Certified in Trauma-Focused Cognitive Behavioral Therapy</Text>
                    </View>
                  </View>
                  
     
                </ScrollView>
              )}
            </>
          )}
        </View>
        
        {renderNotesModal()}
        {renderClientInfoModal()}
    
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Added new scroll-related styles
  dashboardContentContainer: {
    paddingBottom: 30,
  },
  clientsListContent: {
    paddingBottom: 20,
  },
  profileContentContainer: {
    paddingBottom: 30,
  },
  educationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  educationIcon: {
    marginRight: 10,
  },
  educationText: {
    fontSize: 15,
    color: '#424242',
    flex: 1,
  },
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  activeTabButton: {
    backgroundColor: '#F3E5F5',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
    marginLeft: 5,
  },
  activeTabButtonText: {
    color: '#9C27B0',
  },
  tabBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  dashboardContainer: {
    flex: 1,
    padding: 20,
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#757575',
  },
  toggleContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 25,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleStateText: {
    fontSize: 14,
    color: '#757575',
  },
  recentClientsSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 15,
  },
  recentClientsList: {
    marginBottom: 10,
  },
  noClientsText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    padding: 20,
  },
  viewAllButton: {
    backgroundColor: '#9C27B0',
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  viewAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clientsContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  clientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  clientsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
  },
  clientsCounter: {
    backgroundColor: '#F3E5F5',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  clientsCountText: {
    color: '#9C27B0',
    fontWeight: '600',
  },
  clientsList: {
    flex: 1,
  },
  noClientsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noClientsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
    marginTop: 15,
    marginBottom: 10,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedClientItem: {
    backgroundColor: '#F3E5F5',
  },
  unreadClientItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  clientAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  clientInfo: {
    flex: 1,
  },
  clientNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  lastMessageText: {
    fontSize: 14,
    color: '#757575',
  },
  unreadLastMessageText: {
    fontWeight: '600',
    color: '#424242',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9C27B0',
    marginLeft: 10,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  clientInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientNameHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
  },
  chatHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesButton: {
    marginRight: 15,
    padding: 5,
  },
  infoButton: {
    marginRight: 15,
    padding: 5,
  },
  backToChatList: {
    padding: 5,
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
    justifyContent: 'flex-start',
  },
  therapistMessageContainer: {
    justifyContent: 'flex-end',
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
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  therapistMessageBubble: {
    backgroundColor: '#9C27B0',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#333',
  },
  therapistMessageText: {
    color: '#fff',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notesModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    minHeight: 300,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  clientInfoModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  closeButton: {
    padding: 5,
  },
  notesDescription: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 15,
  },
  notesInput: {
    flex: 1,
    minHeight: 150,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  saveNotesButton: {
    backgroundColor: '#9C27B0',
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveNotesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clientInfoScroll: {
    padding: 20,
  },
  clientInfoSection: {
    marginBottom: 25,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: '#757575',
    width: 150,
  },
  infoValue: {
    fontSize: 15,
    color: '#424242',
    flex: 1,
    fontWeight: '500',
  },
  challengesList: {
    marginTop: 10,
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeText: {
    fontSize: 15,
    color: '#424242',
    marginLeft: 10,
  },
  noDataText: {
    fontSize: 15,
    color: '#9E9E9E',
    fontStyle: 'italic',
    marginTop: 5,
  },
  assessmentResults: {
    marginTop: 10,
  },
  assessmentItem: {
    marginBottom: 12,
  },
  questionIndex: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C27B0',
    marginBottom: 3,
  },
  answerText: {
    fontSize: 15,
    color: '#424242',
  },
  notesText: {
    fontSize: 15,
    color: '#424242',
    lineHeight: 22,
    marginTop: 5,
    marginBottom: 15,
  },
  editNotesButton: {
    backgroundColor: '#F3E5F5',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignSelf: 'flex-start',
  },
  editNotesButtonText: {
    color: '#9C27B0',
    fontSize: 14,
    fontWeight: '500',
  },
  profileContainer: {
    flex: 1,
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  therapistAvatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  therapistName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 5,
  },
  therapistSpecialty: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  onlineDot: {
    backgroundColor: '#4CAF50',
  },
  offlineDot: {
    backgroundColor: '#9E9E9E',
  },
  statusText: {
    fontSize: 14,
    color: '#757575',
  },
  profileSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  bioText: {
    fontSize: 15,
    color: '#424242',
    lineHeight: 22,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactText: {
    fontSize: 15,
    color: '#424242',
    marginLeft: 10,
  },
  editProfileButton: {
    backgroundColor: '#9C27B0',
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  editProfileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TherapistAdminScreen;