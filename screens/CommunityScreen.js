import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  Platform,
  Dimensions,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../firebaseConfig';
import { ref, set, get, push, query, orderByChild, limitToLast } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const CommunityScreen = ({ navigateTo }) => {
  const [userPhone, setUserPhone] = useState('');
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef(null);

  const categories = [
    'General',
    'Anxiety',
    'Depression',
    'Stress',
    'Sleep',
    'Relationships',
    'Work',
    'Self-care',
    'Recovery',
    'Motivation'
  ];

  // Load user data on mount
  useEffect(() => {
    loadUserData();
  }, []);

  // Load posts when category filter changes
  useEffect(() => {
    loadPosts();
  }, [filterCategory, userPhone]);

  const loadUserData = async () => {
    try {
      const storedPhone = await AsyncStorage.getItem('userPhone');
      if (storedPhone) {
        setUserPhone(storedPhone);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      const postsRef = ref(database, 'SmartMentalHealthApplication/community/posts');
      const postsQuery = query(postsRef, orderByChild('timestamp'), limitToLast(100));
      const snapshot = await get(postsQuery);
      
      if (snapshot.exists()) {
        const postsData = [];
        snapshot.forEach((childSnapshot) => {
          postsData.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
          });
        });
        
        // Sort by timestamp (newest first)
        postsData.sort((a, b) => b.timestamp - a.timestamp);
        
        // Apply category filter if not 'All'
        const filteredPosts = filterCategory === 'All' 
          ? postsData 
          : postsData.filter(post => post.category === filterCategory);
        
        setPosts(filteredPosts);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      Alert.alert('Error', 'Failed to load community posts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addPost = async () => {
    if (!postContent.trim()) {
      Alert.alert('Error', 'Please enter something to share with the community.');
      return;
    }

    try {
      setIsSending(true);
      
      const newPost = {
        content: postContent.trim(),
        category: selectedCategory,
        timestamp: Date.now(),
        date: new Date().toISOString(),
        likes: 0,
        // No user identification stored for anonymity
      };
      
      const postsRef = ref(database, 'SmartMentalHealthApplication/community/posts');
      const newPostRef = push(postsRef);
      await set(newPostRef, newPost);
      
      // Reset form and close modal
      setPostContent('');
      setSelectedCategory('General');
      setShowAddModal(false);
      
      // Reload posts
      loadPosts();
      
      // Scroll to top to see the new post
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    } catch (error) {
      console.error('Error adding post:', error);
      Alert.alert('Error', 'Failed to share your post. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const likePost = async (postId, currentLikes) => {
    try {
      // Simple like feature - no tracking of who liked to maintain anonymity
      const postRef = ref(database, `SmartMentalHealthApplication/community/posts/${postId}`);
      await set(postRef, {
        ...posts.find(post => post.id === postId),
        likes: currentLikes + 1
      });
      
      // Update local state
      setPosts(prevPosts => prevPosts.map(post => 
        post.id === postId ? { ...post, likes: post.likes + 1 } : post
      ));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return 'Just now';
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
    } else if (diffDay < 7) {
      return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon name="message-text-outline" size={80} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Posts Yet</Text>
      <Text style={styles.emptyText}>
        Be the first to share your experiences or thoughts with the community.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.emptyButtonText}>Share Something</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPostItem = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={[styles.categoryBadge, getCategoryStyle(item.category)]}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        <Text style={styles.postDate}>{formatDate(item.timestamp)}</Text>
      </View>
      
      <Text style={styles.postContent}>{item.content}</Text>
      
      <View style={styles.postFooter}>
        <TouchableOpacity
          style={styles.likeButton}
          onPress={() => likePost(item.id, item.likes)}
        >
          <Icon name="heart-outline" size={20} color="#00BCD4" />
          <Text style={styles.likeCount}>{item.likes > 0 ? item.likes : 'Like'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getCategoryStyle = (category) => {
    switch (category) {
      case 'Anxiety':
        return { backgroundColor: 'rgba(156, 39, 176, 0.1)', borderColor: '#9C27B0' };
      case 'Depression':
        return { backgroundColor: 'rgba(63, 81, 181, 0.1)', borderColor: '#3F51B5' };
      case 'Stress':
        return { backgroundColor: 'rgba(233, 30, 99, 0.1)', borderColor: '#E91E63' };
      case 'Sleep':
        return { backgroundColor: 'rgba(33, 150, 243, 0.1)', borderColor: '#2196F3' };
      case 'Relationships':
        return { backgroundColor: 'rgba(255, 152, 0, 0.1)', borderColor: '#FF9800' };
      case 'Work':
        return { backgroundColor: 'rgba(0, 150, 136, 0.1)', borderColor: '#009688' };
      case 'Self-care':
        return { backgroundColor: 'rgba(139, 195, 74, 0.1)', borderColor: '#8BC34A' };
      case 'Recovery':
        return { backgroundColor: 'rgba(76, 175, 80, 0.1)', borderColor: '#4CAF50' };
      case 'Motivation':
        return { backgroundColor: 'rgba(255, 87, 34, 0.1)', borderColor: '#FF5722' };
      default:
        return { backgroundColor: 'rgba(0, 188, 212, 0.1)', borderColor: '#00BCD4' };
    }
  };

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        setShowAddModal(false);
        setPostContent('');
        setSelectedCategory('General');
      }}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidView}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share with the Community</Text>
            
            <Text style={styles.inputLabel}>Choose a category</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category ? getCategoryStyle(category) : styles.categoryChipInactive
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === category && styles.categoryChipTextActive
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Text style={styles.inputLabel}>Your message</Text>
            <TextInput
              style={styles.contentInput}
              value={postContent}
              onChangeText={setPostContent}
              placeholder="Share your experiences, thoughts, or ask for support..."
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.characterCount}>
              {postContent.length}/500 characters
            </Text>
            
            <Text style={styles.anonymousNote}>
              Your post will be shared anonymously to protect your privacy.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setPostContent('');
                  setSelectedCategory('General');
                }}
                disabled={isSending}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalShareButton,
                  (!postContent.trim()) && styles.modalShareButtonDisabled
                ]}
                onPress={addPost}
                disabled={!postContent.trim() || isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalShareButtonText}>Share</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#00BCD4', '#006064']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigateTo('dashboard')}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Community</Text>
        </View>
        
        <View style={styles.headerDescription}>
          <Text style={styles.headerDescriptionText}>
            A safe space to share experiences and support each other
          </Text>
        </View>
      </LinearGradient>
      
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterCategory === 'All' && styles.filterChipActive
            ]}
            onPress={() => setFilterCategory('All')}
          >
            <Text
              style={[
                styles.filterChipText,
                filterCategory === 'All' && styles.filterChipTextActive
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterChip,
                filterCategory === category && styles.filterChipActive
              ]}
              onPress={() => setFilterCategory(category)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterCategory === category && styles.filterChipTextActive
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00BCD4" />
            <Text style={styles.loadingText}>Loading community posts...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={posts}
            renderItem={renderPostItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.postsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyList}
          />
        )}
      </View>
      
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <LinearGradient
          colors={['#00BCD4', '#00838F']}
          style={styles.addButtonGradient}
          borderRadius={30}
        >
          <Icon name="plus" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
      
      {renderAddModal()}
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
  headerDescription: {
    paddingHorizontal: 20,
    marginTop: 5,
  },
  headerDescriptionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  filterContainer: {
    paddingVertical: 12,
    backgroundColor: '#fff',
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
  filterScrollContent: {
    paddingHorizontal: 15,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#00BCD4',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  postsList: {
    paddingBottom: 80, // To ensure space for the add button
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
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
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  postDate: {
    fontSize: 12,
    color: '#999',
  },
  postContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  addButtonGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#444',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  emptyButton: {
    backgroundColor: '#00BCD4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  keyboardAvoidView: {
    width: '100%',
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#006064',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  categoriesContainer: {
    paddingBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryChipInactive: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ddd',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextActive: {
    fontWeight: '600',
  },
  contentInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#333',
    minHeight: 150,
    maxHeight: 300,
    textAlignVertical: 'top',
    marginBottom: 5,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginBottom: 15,
  },
  anonymousNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    marginRight: 10,
  },
  modalCancelButtonText: {
    color: '#00838F',
    fontSize: 16,
    fontWeight: '600',
  },
  modalShareButton: {
    flex: 2,
    backgroundColor: '#00BCD4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalShareButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  modalShareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CommunityScreen;