import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Linking,
  FlatList,
  TextInput,
  Platform,
  Share,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../firebaseConfig';
import { ref, get, set, push } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const RESOURCE_TYPES = [
  { id: 'all', title: 'All Resources', icon: 'view-grid' },
  { id: 'videos', title: 'Videos', icon: 'youtube' },
  { id: 'books', title: 'Books', icon: 'book-open-variant' },
  { id: 'articles', title: 'Articles', icon: 'file-document' },
  { id: 'apps', title: 'Apps', icon: 'cellphone' },
  { id: 'podcasts', title: 'Podcasts', icon: 'podcast' },
  { id: 'crisis', title: 'Crisis Resources', icon: 'phone-in-talk' },
  { id: 'saved', title: 'Saved', icon: 'bookmark' }
];

const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const EducationalResourcesScreen = ({ navigateTo }) => {
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedResources, setSavedResources] = useState([]);
  const [userPhone, setUserPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Add Resource Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceAuthor, setNewResourceAuthor] = useState('');
  const [newResourceDescription, setNewResourceDescription] = useState('');
  const [newResourceURL, setNewResourceURL] = useState('');
  const [newResourceCategory, setNewResourceCategory] = useState('');
  const [newResourceLevel, setNewResourceLevel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUserData();
    loadResources();
  }, []);

  useEffect(() => {
    filterResources();
  }, [resources, selectedType, searchQuery, savedResources]);

  const loadUserData = async () => {
    try {
      const storedPhone = await AsyncStorage.getItem('userPhone');
      if (storedPhone) {
        setUserPhone(storedPhone);
        loadSavedResources(storedPhone);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadResources = async () => {
    try {
      setIsLoading(true);
      const resourcesRef = ref(database, 'SmartMentalHealthApplication/resources');
      const snapshot = await get(resourcesRef);
      
      if (snapshot.exists()) {
        const resourcesData = snapshot.val();
        const resourcesList = Object.keys(resourcesData).map(key => ({
          id: key,
          ...resourcesData[key]
        }));
        
        // Sort resources by category and then by title
        resourcesList.sort((a, b) => {
          if (a.category === b.category) {
            return a.title.localeCompare(b.title);
          }
          return a.category.localeCompare(b.category);
        });
        
        setResources(resourcesList);
      } else {
        // If no resources exist in the database, use the default resources
        setResources(DEFAULT_RESOURCES);
        
        // Save default resources to database if none exist
        const resourcesRef = ref(database, 'SmartMentalHealthApplication/resources');
        DEFAULT_RESOURCES.forEach(async (resource) => {
          const newResourceRef = push(resourcesRef);
          await set(newResourceRef, {
            ...resource,
            id: newResourceRef.key
          });
        });
      }
    } catch (error) {
      console.error('Error loading resources:', error);
      setResources(DEFAULT_RESOURCES); // Fallback to default resources on error
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedResources = async (phone) => {
    try {
      const savedRef = ref(database, `SmartMentalHealthApplication/users/${phone}/savedResources`);
      const snapshot = await get(savedRef);
      
      if (snapshot.exists()) {
        const savedData = snapshot.val();
        setSavedResources(Object.keys(savedData));
      }
    } catch (error) {
      console.error('Error loading saved resources:', error);
    }
  };

  const filterResources = () => {
    let filtered = [...resources];
    
    // Filter by type
    if (selectedType === 'saved') {
      filtered = filtered.filter(resource => savedResources.includes(resource.id));
    } else if (selectedType !== 'all') {
      filtered = filtered.filter(resource => resource.category === selectedType);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        resource => 
          resource.title.toLowerCase().includes(query) ||
          resource.description.toLowerCase().includes(query) ||
          (resource.author && resource.author.toLowerCase().includes(query))
      );
    }
    
    setFilteredResources(filtered);
  };

  const toggleSaveResource = async (resourceId) => {
    if (!userPhone) return;
    
    try {
      const savedRef = ref(database, `SmartMentalHealthApplication/users/${userPhone}/savedResources/${resourceId}`);
      
      if (savedResources.includes(resourceId)) {
        // Unsave resource
        await set(savedRef, null);
        setSavedResources(savedResources.filter(id => id !== resourceId));
      } else {
        // Save resource
        await set(savedRef, true);
        setSavedResources([...savedResources, resourceId]);
      }
    } catch (error) {
      console.error('Error saving resource:', error);
      Alert.alert('Error', 'Failed to save this resource. Please try again.');
    }
  };

  const handleOpenLink = (url, title) => {
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', `Cannot open URL: ${url}`);
      }
    });
  };

  const handleShareResource = async (resource) => {
    try {
      await Share.share({
        message: `Check out this mental health resource: ${resource.title}\n${resource.url}`,
        title: resource.title
      });
    } catch (error) {
      console.error('Error sharing resource:', error);
    }
  };
  
  // Add new resource function
  const addNewResource = async () => {
    // Validate input
    if (!newResourceTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the resource.');
      return;
    }
    
    if (!newResourceDescription.trim()) {
      Alert.alert('Error', 'Please enter a description for the resource.');
      return;
    }
    
    if (!newResourceURL.trim()) {
      Alert.alert('Error', 'Please enter a URL for the resource.');
      return;
    }
    
    if (!newResourceCategory) {
      Alert.alert('Error', 'Please select a category for the resource.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create new resource object
      const newResource = {
        title: newResourceTitle.trim(),
        description: newResourceDescription.trim(),
        url: newResourceURL.trim(),
        category: newResourceCategory,
        date: new Date().toISOString(),
        addedBy: userPhone || 'anonymous', // Track who added the resource
      };
      
      // Add optional fields if provided
      if (newResourceAuthor.trim()) {
        newResource.author = newResourceAuthor.trim();
      }
      
      if (newResourceLevel) {
        newResource.level = newResourceLevel;
      }
      
      // Add to Firebase
      const resourcesRef = ref(database, 'SmartMentalHealthApplication/resources');
      const newResourceRef = push(resourcesRef);
      await set(newResourceRef, {
        ...newResource,
        id: newResourceRef.key
      });
      
      // Clear form and close modal
      resetForm();
      setShowAddModal(false);
      
      // Reload resources
      loadResources();
      
      // Show success message
      Alert.alert('Success', 'Your resource has been added. Thank you for contributing!');
      
    } catch (error) {
      console.error('Error adding resource:', error);
      Alert.alert('Error', 'Failed to add resource. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setNewResourceTitle('');
    setNewResourceAuthor('');
    setNewResourceDescription('');
    setNewResourceURL('');
    setNewResourceCategory('');
    setNewResourceLevel('');
  };

  const renderTypeItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.typeButton,
        selectedType === item.id && styles.selectedTypeButton
      ]}
      onPress={() => setSelectedType(item.id)}
    >
      <Icon 
        name={item.icon} 
        size={24} 
        color={selectedType === item.id ? '#fff' : '#607D8B'} 
      />
      <Text
        style={[
          styles.typeButtonText,
          selectedType === item.id && styles.selectedTypeButtonText
        ]}
      >
        {item.title}
      </Text>
    </TouchableOpacity>
  );
  
  const renderCategoryOption = (category) => {
    const selected = newResourceCategory === category.id;
    return (
      <TouchableOpacity
        key={category.id}
        style={[
          styles.categoryOption,
          selected && styles.selectedCategoryOption,
          { borderColor: selected ? getCategoryStyle(category.id).backgroundColor : '#E0E0E0' }
        ]}
        onPress={() => setNewResourceCategory(category.id)}
      >
        <Icon 
          name={category.icon} 
          size={20} 
          color={selected ? getCategoryStyle(category.id).backgroundColor : '#757575'} 
          style={styles.categoryOptionIcon}
        />
        <Text 
          style={[
            styles.categoryOptionText,
            selected && { color: getCategoryStyle(category.id).backgroundColor, fontWeight: '600' }
          ]}
        >
          {category.title}
        </Text>
      </TouchableOpacity>
    );
  };
  
  const renderLevelOption = (level) => {
    const selected = newResourceLevel === level;
    return (
      <TouchableOpacity
        key={level}
        style={[
          styles.levelOption,
          selected && styles.selectedLevelOption,
          selected && { backgroundColor: getLevelStyle(level).backgroundColor }
        ]}
        onPress={() => setNewResourceLevel(level)}
      >
        <Text style={[
          styles.levelOptionText,
          selected && { color: '#fff' }
        ]}>
          {level}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderResourceCard = ({ item }) => {
    const isSaved = savedResources.includes(item.id);
    
    return (
      <View style={styles.resourceCard}>
        <View style={styles.resourceHeader}>
          <View style={styles.resourceTitleContainer}>
            <Text style={styles.resourceTitle}>{item.title}</Text>
            {item.author && (
              <Text style={styles.resourceAuthor}>By {item.author}</Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => toggleSaveResource(item.id)}
          >
            <Icon
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isSaved ? '#607D8B' : '#9E9E9E'}
            />
          </TouchableOpacity>
        </View>
        
        <View style={styles.resourceCategoryContainer}>
          <View style={[styles.categoryBadge, getCategoryStyle(item.category)]}>
            <Icon name={getCategoryIcon(item.category)} size={12} color="#fff" />
            <Text style={styles.categoryText}>
              {getCategoryTitle(item.category)}
            </Text>
          </View>
          
          {item.level && (
            <View style={[styles.levelBadge, getLevelStyle(item.level)]}>
              <Text style={styles.levelText}>{item.level}</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.resourceDescription}>{item.description}</Text>
        
        <View style={styles.resourceFooter}>
          <TouchableOpacity
            style={styles.openButton}
            onPress={() => handleOpenLink(item.url, item.title)}
          >
            <Icon name="open-in-new" size={16} color="#fff" />
            <Text style={styles.openButtonText}>Open</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => handleShareResource(item)}
          >
            <Icon name="share-variant" size={16} color="#607D8B" />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getCategoryStyle = (category) => {
    switch (category) {
      case 'videos':
        return { backgroundColor: '#FF0000' }; // YouTube red
      case 'books':
        return { backgroundColor: '#4CAF50' }; // Green
      case 'articles':
        return { backgroundColor: '#2196F3' }; // Blue
      case 'apps':
        return { backgroundColor: '#9C27B0' }; // Purple
      case 'podcasts':
        return { backgroundColor: '#FF9800' }; // Orange
      case 'crisis':
        return { backgroundColor: '#F44336' }; // Red
      default:
        return { backgroundColor: '#607D8B' }; // Blue Grey
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'videos':
        return 'youtube';
      case 'books':
        return 'book-open-variant';
      case 'articles':
        return 'file-document';
      case 'apps':
        return 'cellphone';
      case 'podcasts':
        return 'podcast';
      case 'crisis':
        return 'phone-in-talk';
      default:
        return 'view-grid';
    }
  };

  const getCategoryTitle = (category) => {
    switch (category) {
      case 'videos':
        return 'Video';
      case 'books':
        return 'Book';
      case 'articles':
        return 'Article';
      case 'apps':
        return 'App';
      case 'podcasts':
        return 'Podcast';
      case 'crisis':
        return 'Crisis';
      default:
        return category;
    }
  };

  const getLevelStyle = (level) => {
    switch (level) {
      case 'Beginner':
        return { backgroundColor: '#4CAF50' }; // Green
      case 'Intermediate':
        return { backgroundColor: '#FF9800' }; // Orange
      case 'Advanced':
        return { backgroundColor: '#F44336' }; // Red
      default:
        return { backgroundColor: '#9E9E9E' }; // Grey
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="magnify" size={80} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Resources Found</Text>
      <Text style={styles.emptyText}>
        Try changing your search criteria or check a different category.
      </Text>
      <TouchableOpacity
        style={styles.addResourceButton}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.addResourceButtonText}>Add a New Resource</Text>
      </TouchableOpacity>
    </View>
  );
  
  const renderAddResourceModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        setShowAddModal(false);
        resetForm();
      }}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidView}
        >
          <ScrollView style={styles.addModalScroll}>
            <View style={styles.addModalContent}>
              <View style={styles.addModalHeader}>
                <Text style={styles.addModalTitle}>Share a Resource</Text>
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  <Icon name="close" size={24} color="#757575" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.addModalSubtitle}>
                Help the community by sharing valuable mental health resources you've found helpful
              </Text>
              
              <Text style={styles.inputLabel}>Resource Title *</Text>
              <TextInput
                style={styles.textInput}
                value={newResourceTitle}
                onChangeText={setNewResourceTitle}
                placeholder="Enter the title of the resource"
                maxLength={100}
                placeholderTextColor="#9E9E9E"
              />
              
              <Text style={styles.inputLabel}>Author/Creator (optional)</Text>
              <TextInput
                style={styles.textInput}
                value={newResourceAuthor}
                onChangeText={setNewResourceAuthor}
                placeholder="Who created this resource?"
                maxLength={100}
                placeholderTextColor="#9E9E9E"
              />
              
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={styles.textAreaInput}
                value={newResourceDescription}
                onChangeText={setNewResourceDescription}
                placeholder="What is this resource about? Why is it helpful?"
                multiline
                maxLength={500}
                placeholderTextColor="#9E9E9E"
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>
                {newResourceDescription.length}/500 characters
              </Text>
              
              <Text style={styles.inputLabel}>Resource URL *</Text>
              <TextInput
                style={styles.textInput}
                value={newResourceURL}
                onChangeText={setNewResourceURL}
                placeholder="https://example.com"
                keyboardType="url"
                autoCapitalize="none"
                placeholderTextColor="#9E9E9E"
              />
              
              <Text style={styles.inputLabel}>Category *</Text>
              <Text style={styles.inputSubLabel}>Select the type of resource</Text>
              <View style={styles.categoriesGrid}>
                {RESOURCE_TYPES.filter(cat => cat.id !== 'all' && cat.id !== 'saved').map(category => 
                  renderCategoryOption(category)
                )}
              </View>
              
              <Text style={styles.inputLabel}>Difficulty Level (optional)</Text>
              <Text style={styles.inputSubLabel}>Select if applicable</Text>
              <View style={styles.levelOptionsRow}>
                {DIFFICULTY_LEVELS.map(level => 
                  renderLevelOption(level)
                )}
              </View>
              
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!newResourceTitle.trim() || !newResourceDescription.trim() || 
                   !newResourceURL.trim() || !newResourceCategory || isSubmitting) && 
                   styles.disabledSubmitButton
                ]}
                onPress={addNewResource}
                disabled={!newResourceTitle.trim() || !newResourceDescription.trim() || 
                         !newResourceURL.trim() || !newResourceCategory || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Resource</Text>
                )}
              </TouchableOpacity>
              
              <Text style={styles.requiredFieldsNote}>* Required fields</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#607D8B', '#37474F']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigateTo('dashboard')}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Educational Resources</Text>
        </View>
      </LinearGradient>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="magnify" size={24} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search resources..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9E9E9E"
          />
          {searchQuery ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Icon name="close" size={18} color="#757575" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      
      <View style={styles.typesContainer}>
        <FlatList
          data={RESOURCE_TYPES}
          renderItem={renderTypeItem}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typesList}
        />
      </View>
      
      <View style={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#607D8B" />
            <Text style={styles.loadingText}>Loading resources...</Text>
          </View>
        ) : filteredResources.length > 0 ? (
          <FlatList
            data={filteredResources}
            renderItem={renderResourceCard}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resourcesList}
          />
        ) : (
          renderEmptyState()
        )}
      </View>
      
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => setShowAddModal(true)}
      >
        <LinearGradient
          colors={['#607D8B', '#455A64']}
          style={styles.floatingAddButtonGradient}
          borderRadius={28}
        >
          <Icon name="plus" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
      
      {renderAddResourceModal()}
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
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  typesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  typesList: {
    paddingHorizontal: 15,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  selectedTypeButton: {
    backgroundColor: '#607D8B',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#607D8B',
    marginLeft: 5,
  },
  selectedTypeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    padding: 15,
  },
  resourcesList: {
    paddingBottom: 80, // Add more padding for the floating button
  },
  resourceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
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
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resourceTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  resourceAuthor: {
    fontSize: 12,
    color: '#757575',
  },
  saveButton: {
    padding: 5,
  },
  resourceCategoryContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  resourceDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 15,
  },
  resourceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 12,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#607D8B',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  openButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  shareButtonText: {
    color: '#607D8B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
  },
  addResourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#607D8B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  addResourceButtonText: {
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
    marginTop: 15,
    fontSize: 16,
    color: '#607D8B',
  },
  floatingAddButton: {
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
  floatingAddButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidView: {
    width: '100%',
    maxHeight: '90%',
  },
  addModalScroll: {
    width: '100%',
  },
  addModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  addModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#607D8B',
  },
  closeModalButton: {
    padding: 5,
  },
  addModalSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 5,
  },
  inputSubLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
  },
  textAreaInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'right',
    marginBottom: 15,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  selectedCategoryOption: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
  },
  categoryOptionIcon: {
    marginRight: 8,
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#555',
  },
  levelOptionsRow: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  levelOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  selectedLevelOption: {
    backgroundColor: '#4CAF50',
  },
  levelOptionText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#607D8B',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledSubmitButton: {
    backgroundColor: '#B0BEC5',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requiredFieldsNote: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 15,
    textAlign: 'center',
  },
});

// Default resources that will be saved to Firebase if none exist
const DEFAULT_RESOURCES = [
  {
    id: '1',
    title: 'Understanding Anxiety: A Comprehensive Guide',
    description: 'This video explains what anxiety is, common symptoms, and effective coping strategies. It narrated by a licensed therapist with practical tips.',
    url: 'https://www.youtube.com/watch?v=WWloIAQpMcQ',
    category: 'videos',
    level: 'Beginner'
  },
  {
    id: '2',
    title: 'Mindfulness Meditation for Beginners',
    description: 'A 10-minute guided meditation perfect for beginners. Learn the basics of mindfulness and how to incorporate it into your daily routine.',
    url: 'https://www.youtube.com/watch?v=U9YKY7fdwyg',
    category: 'videos',
    level: 'Beginner'
  },
  {
    id: '3',
    title: 'The Anxiety and Phobia Workbook',
    author: 'Edmund J. Bourne',
    description: 'A practical guide for identifying, understanding, and overcoming anxiety and phobias. Includes exercises and techniques based on CBT principles.',
    url: 'https://www.amazon.com/Anxiety-Phobia-Workbook-Edmund-Bourne/dp/1626252157',
    category: 'books'
  },
  {
    id: '4',
    title: 'The Body Keeps the Score',
    author: 'Bessel van der Kolk',
    description: 'Explores how trauma affects the body and mind, and innovative treatments that help trauma survivors reclaim their lives.',
    url: 'https://www.amazon.com/Body-Keeps-Score-Healing-Trauma/dp/0143127748',
    category: 'books'
  },
  {
    id: '5',
    title: 'How to Build Resilience During Difficult Times',
    description: 'This article outlines practical steps to develop emotional resilience during challenging periods in life. Includes science-backed strategies and expert insights.',
    url: 'https://www.helpguide.org/articles/mental-health/building-better-mental-health.htm',
    category: 'articles'
  },
  {
    id: '6',
    title: 'The Science of Sleep and Mental Health',
    description: 'An in-depth look at how sleep affects mental health, with practical tips for improving sleep hygiene and overall wellbeing.',
    url: 'https://www.sleepfoundation.org/mental-health',
    category: 'articles'
  },
  {
    id: '7',
    title: 'Headspace',
    description: 'A popular meditation app offering guided sessions for stress, anxiety, sleep, and focus. Features various course lengths and difficulty levels.',
    url: 'https://www.headspace.com/',
    category: 'apps'
  },
  {
    id: '8',
    title: 'Calm',
    description: 'An app for meditation, sleep stories, and relaxation. Offers guided meditations of varying lengths and topics for all experience levels.',
    url: 'https://www.calm.com/',
    category: 'apps'
  },
  {
    id: '9',
    title: 'The Mental Health Podcast',
    description: 'Weekly episodes featuring interviews with psychologists, researchers, and individuals sharing their mental health journeys and coping strategies.',
    url: 'https://mentalpod.com/',
    category: 'podcasts'
  },
  {
    id: '10',
    title: 'Therapy for Black Girls',
    description: 'A podcast focused on mental health and personal development for Black women, hosted by licensed psychologist Dr. Joy Harden Bradford.',
    url: 'https://therapyforblackgirls.com/podcast/',
    category: 'podcasts'
  },
  {
    id: '11',
    title: 'National Suicide Prevention Lifeline',
    description: 'Free and confidential support for people in distress, 24/7. Provides crisis resources for you or your loved ones.',
    url: 'https://988lifeline.org/',
    category: 'crisis'
  },
  {
    id: '12',
    title: 'Crisis Text Line',
    description: 'Free, 24/7 support via text message. Text HOME to 741741 to connect with a trained crisis counselor.',
    url: 'https://www.crisistextline.org/',
    category: 'crisis'
  }
];

export default EducationalResourcesScreen;