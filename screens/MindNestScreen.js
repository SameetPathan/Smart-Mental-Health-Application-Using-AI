import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Platform,
  TextInput,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../firebaseConfig';
import { ref, get, set, push } from 'firebase/database';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

const MindNestScreen = ({ navigateTo  }) => {
  const [activeTab, setActiveTab] = useState('mood');
  const [showAddModal, setShowAddModal] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userPhone, setUserPhone] = useState('');
  const [moodData, setMoodData] = useState([]);
  const [sleepData, setSleepData] = useState([]);
  const [stressData, setStressData] = useState([]);

  // Form data
  const [moodRating, setMoodRating] = useState(5);
  const [moodNote, setMoodNote] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState(5);
  const [sleepNote, setSleepNote] = useState('');
  const [stressLevel, setStressLevel] = useState(5);
  const [stressNote, setStressNote] = useState('');

  // Load user data on mount
  useEffect(() => {
    loadUserData();
  }, []);

  // Load tracking data when user data is available
  useEffect(() => {
    if (userPhone) {
      loadTrackingData();
    }
  }, [userPhone]);

  const loadUserData = async () => {
    try {
      const storedPhone = await AsyncStorage.getItem('userPhone');
      if (storedPhone) {
        setUserPhone(storedPhone);
        
        // Fetch user data from Firebase
        const userRef = ref(database, `SmartMentalHealthApplication/users/${storedPhone}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          setUserData(snapshot.val());
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadTrackingData = async () => {
    try {
      // Fetch mood data
      const moodRef = ref(database, `SmartMentalHealthApplication/users/${userPhone}/tracking/mood`);
      const moodSnapshot = await get(moodRef);
      
      if (moodSnapshot.exists()) {
        const moodEntries = [];
        moodSnapshot.forEach((childSnapshot) => {
          moodEntries.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
          });
        });
        setMoodData(moodEntries.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }

      // Fetch sleep data
      const sleepRef = ref(database, `SmartMentalHealthApplication/users/${userPhone}/tracking/sleep`);
      const sleepSnapshot = await get(sleepRef);
      
      if (sleepSnapshot.exists()) {
        const sleepEntries = [];
        sleepSnapshot.forEach((childSnapshot) => {
          sleepEntries.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
          });
        });
        setSleepData(sleepEntries.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }

      // Fetch stress data
      const stressRef = ref(database, `SmartMentalHealthApplication/users/${userPhone}/tracking/stress`);
      const stressSnapshot = await get(stressRef);
      
      if (stressSnapshot.exists()) {
        const stressEntries = [];
        stressSnapshot.forEach((childSnapshot) => {
          stressEntries.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
          });
        });
        setStressData(stressEntries.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
    }
  };

  const addMoodEntry = async () => {
    try {
      const newEntry = {
        rating: moodRating,
        note: moodNote,
        date: new Date().toISOString(),
      };
      
      const moodRef = ref(database, `SmartMentalHealthApplication/users/${userPhone}/tracking/mood`);
      const newEntryRef = push(moodRef);
      await set(newEntryRef, newEntry);
      
      // Reset form and close modal
      setMoodNote('');
      setMoodRating(5);
      setShowAddModal(false);
      
      // Reload data
      loadTrackingData();
    } catch (error) {
      console.error('Error adding mood entry:', error);
    }
  };

  const addSleepEntry = async () => {
    if (!sleepHours || isNaN(sleepHours)) {
      alert('Please enter valid sleep hours');
      return;
    }
    
    try {
      const newEntry = {
        hours: parseFloat(sleepHours),
        quality: sleepQuality,
        note: sleepNote,
        date: new Date().toISOString(),
      };
      
      const sleepRef = ref(database, `SmartMentalHealthApplication/users/${userPhone}/tracking/sleep`);
      const newEntryRef = push(sleepRef);
      await set(newEntryRef, newEntry);
      
      // Reset form and close modal
      setSleepHours('');
      setSleepQuality(5);
      setSleepNote('');
      setShowAddModal(false);
      
      // Reload data
      loadTrackingData();
    } catch (error) {
      console.error('Error adding sleep entry:', error);
    }
  };

  const addStressEntry = async () => {
    try {
      const newEntry = {
        level: stressLevel,
        note: stressNote,
        date: new Date().toISOString(),
      };
      
      const stressRef = ref(database, `SmartMentalHealthApplication/users/${userPhone}/tracking/stress`);
      const newEntryRef = push(stressRef);
      await set(newEntryRef, newEntry);
      
      // Reset form and close modal
      setStressLevel(5);
      setStressNote('');
      setShowAddModal(false);
      
      // Reload data
      loadTrackingData();
    } catch (error) {
      console.error('Error adding stress entry:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Chart configurations
  const getChartData = () => {
    let data = [];
    let labels = [];
    
    if (activeTab === 'mood') {
      data = moodData.slice(0, 7).map(entry => entry.rating).reverse();
      labels = moodData.slice(0, 7).map(entry => {
        const date = new Date(entry.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }).reverse();
    } else if (activeTab === 'sleep') {
      data = sleepData.slice(0, 7).map(entry => entry.hours).reverse();
      labels = sleepData.slice(0, 7).map(entry => {
        const date = new Date(entry.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }).reverse();
    } else if (activeTab === 'stress') {
      data = stressData.slice(0, 7).map(entry => entry.level).reverse();
      labels = stressData.slice(0, 7).map(entry => {
        const date = new Date(entry.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }).reverse();
    }
    
    return {
      labels,
      datasets: [
        {
          data: data.length > 0 ? data : [0],
          color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: [activeTab === 'mood' ? 'Mood Rating' : activeTab === 'sleep' ? 'Sleep Hours' : 'Stress Level']
    };
  };

  // Render entry items
  const renderEntryItem = (entry, type) => {
    let mainValue = '';
    let label = '';
    
    if (type === 'mood') {
      mainValue = `${entry.rating}/10`;
      label = 'Mood Rating';
    } else if (type === 'sleep') {
      mainValue = `${entry.hours} hrs`;
      label = 'Sleep Duration';
    } else if (type === 'stress') {
      mainValue = `${entry.level}/10`;
      label = 'Stress Level';
    }
    
    return (
      <View key={entry.id} style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={styles.entryValueContainer}>
            <Text style={styles.entryValue}>{mainValue}</Text>
            <Text style={styles.entryLabel}>{label}</Text>
          </View>
          <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
        </View>
        
        {entry.note && (
          <View style={styles.entryNoteContainer}>
            <Text style={styles.entryNoteLabel}>Note:</Text>
            <Text style={styles.entryNote}>{entry.note}</Text>
          </View>
        )}
        
        {type === 'sleep' && (
          <View style={styles.entryExtraContainer}>
            <Text style={styles.entryExtraLabel}>Sleep Quality:</Text>
            <Text style={styles.entryExtraValue}>{entry.quality}/10</Text>
          </View>
        )}
      </View>
    );
  };

  // Render add modal based on active tab
  const renderAddModal = () => {
    return (
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {activeTab === 'mood' ? 'Add Mood Entry' : 
               activeTab === 'sleep' ? 'Add Sleep Entry' : 'Add Stress Entry'}
            </Text>
            
            {activeTab === 'mood' && (
              <>
                <Text style={styles.inputLabel}>Mood Rating (1-10)</Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={[
                        styles.ratingButton,
                        moodRating === rating && styles.selectedRatingButton
                      ]}
                      onPress={() => setMoodRating(rating)}
                    >
                      <Text style={[
                        styles.ratingText,
                        moodRating === rating && styles.selectedRatingText
                      ]}>
                        {rating}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.inputLabel}>Note (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="How are you feeling today?"
                  value={moodNote}
                  onChangeText={setMoodNote}
                  multiline
                />
                
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addMoodEntry}
                >
                  <Text style={styles.addButtonText}>Save Mood Entry</Text>
                </TouchableOpacity>
              </>
            )}
            
            {activeTab === 'sleep' && (
              <>
                <Text style={styles.inputLabel}>Sleep Duration (hours)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter sleep hours (e.g. 7.5)"
                  value={sleepHours}
                  onChangeText={setSleepHours}
                  keyboardType="numeric"
                />
                
                <Text style={styles.inputLabel}>Sleep Quality (1-10)</Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={[
                        styles.ratingButton,
                        sleepQuality === rating && styles.selectedRatingButton
                      ]}
                      onPress={() => setSleepQuality(rating)}
                    >
                      <Text style={[
                        styles.ratingText,
                        sleepQuality === rating && styles.selectedRatingText
                      ]}>
                        {rating}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.inputLabel}>Note (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="How did you sleep?"
                  value={sleepNote}
                  onChangeText={setSleepNote}
                  multiline
                />
                
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addSleepEntry}
                >
                  <Text style={styles.addButtonText}>Save Sleep Entry</Text>
                </TouchableOpacity>
              </>
            )}
            
            {activeTab === 'stress' && (
              <>
                <Text style={styles.inputLabel}>Stress Level (1-10)</Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={[
                        styles.ratingButton,
                        stressLevel === rating && styles.selectedRatingButton
                      ]}
                      onPress={() => setStressLevel(rating)}
                    >
                      <Text style={[
                        styles.ratingText,
                        stressLevel === rating && styles.selectedRatingText
                      ]}>
                        {rating}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.inputLabel}>Note (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="What's causing your stress?"
                  value={stressNote}
                  onChangeText={setStressNote}
                  multiline
                />
                
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addStressEntry}
                >
                  <Text style={styles.addButtonText}>Save Stress Entry</Text>
                </TouchableOpacity>
              </>
            )}
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#43A047', '#2E7D32']}
        style={styles.header}
      >
      <View style={styles.headerContent}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigateTo('dashboard')}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>MindNest</Text>
    </View>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'mood' && styles.activeTabButton]}
            onPress={() => setActiveTab('mood')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'mood' && styles.activeTabButtonText]}>Mood</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'sleep' && styles.activeTabButton]}
            onPress={() => setActiveTab('sleep')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'sleep' && styles.activeTabButtonText]}>Sleep</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'stress' && styles.activeTabButton]}
            onPress={() => setActiveTab('stress')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'stress' && styles.activeTabButtonText]}>Stress</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      <ScrollView style={styles.content}>
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {activeTab === 'mood' ? 'Mood Trends' : 
             activeTab === 'sleep' ? 'Sleep Patterns' : 'Stress Levels'}
          </Text>
          
          {(activeTab === 'mood' && moodData.length > 0) || 
           (activeTab === 'sleep' && sleepData.length > 0) || 
           (activeTab === 'stress' && stressData.length > 0) ? (
            <LineChart
              data={getChartData()}
              width={chartWidth}
              height={220}
              yAxisSuffix={activeTab === 'sleep' ? "h" : ""}
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: activeTab === 'sleep' ? 1 : 0,
                color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#43A047"
                }
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16
              }}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No data available yet</Text>
              <Text style={styles.noDataSubtext}>Add your first entry to see trends</Text>
            </View>
          )}
        </View>
        
        <View style={styles.entriesContainer}>
          <View style={styles.entriesHeader}>
            <Text style={styles.entriesTitle}>
              {activeTab === 'mood' ? 'Mood Entries' : 
               activeTab === 'sleep' ? 'Sleep Entries' : 'Stress Entries'}
            </Text>
            
            <TouchableOpacity
              style={styles.entriesAddButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.entriesAddButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          
          {activeTab === 'mood' && (
            moodData.length > 0 ? (
              moodData.map(entry => renderEntryItem(entry, 'mood'))
            ) : (
              <View style={styles.emptyEntriesContainer}>
                <Text style={styles.emptyEntriesText}>No mood entries yet</Text>
                <Text style={styles.emptyEntriesSubtext}>Track your mood to improve self-awareness</Text>
              </View>
            )
          )}
          
          {activeTab === 'sleep' && (
            sleepData.length > 0 ? (
              sleepData.map(entry => renderEntryItem(entry, 'sleep'))
            ) : (
              <View style={styles.emptyEntriesContainer}>
                <Text style={styles.emptyEntriesText}>No sleep entries yet</Text>
                <Text style={styles.emptyEntriesSubtext}>Track your sleep to improve sleep patterns</Text>
              </View>
            )
          )}
          
          {activeTab === 'stress' && (
            stressData.length > 0 ? (
              stressData.map(entry => renderEntryItem(entry, 'stress'))
            ) : (
              <View style={styles.emptyEntriesContainer}>
                <Text style={styles.emptyEntriesText}>No stress entries yet</Text>
                <Text style={styles.emptyEntriesSubtext}>Track your stress to identify triggers</Text>
              </View>
            )
          )}
        </View>
      </ScrollView>
      
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
  tabContainer: {
    flexDirection: 'row',
    marginTop: 15,
    paddingHorizontal: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  activeTabButton: {
    borderBottomColor: '#fff',
  },
  tabButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 8,
  },
  entriesContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  entriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  entriesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  entriesAddButton: {
    backgroundColor: '#43A047',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  entriesAddButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyEntriesContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyEntriesText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
  },
  emptyEntriesSubtext: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 8,
    textAlign: 'center',
  },
  entryCard: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  entryValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  entryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginRight: 6,
  },
  entryLabel: {
    fontSize: 14,
    color: '#666',
  },
  entryDate: {
    fontSize: 12,
    color: '#888',
  },
  entryNoteContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  entryNoteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  entryNote: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  entryExtraContainer: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  entryExtraLabel: {
    fontSize: 14,
    color: '#555',
    marginRight: 5,
  },
  entryExtraValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
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
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  ratingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  ratingButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    margin: 5,
  },
  selectedRatingButton: {
    backgroundColor: '#43A047',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  selectedRatingText: {
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#43A047',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default MindNestScreen;