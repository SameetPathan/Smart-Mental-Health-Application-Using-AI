import React, { useState, useEffect, useRef } from "react";
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
  Image,
  KeyboardAvoidingView,
  Animated,
  Keyboard,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "../firebaseConfig";
import { ref, set, get, push, remove } from "firebase/database";
import { PanGestureHandler } from "react-native-gesture-handler";

const { width, height } = Dimensions.get("window");
const pageWidth = width - 60;
const pageHeight = height * 0.6;

const DiaryScreen = ({ navigateTo }) => {
  const [userPhone, setUserPhone] = useState("");
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [entryTitle, setEntryTitle] = useState("");
  const [entryContent, setEntryContent] = useState("");
  const editScrollViewRef = useRef(null);
  const [mood, setMood] = useState("neutral");
  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef(null);
  const pageAnimation = useRef(new Animated.Value(0)).current;
  const [isFlipping, setIsFlipping] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const modalScrollViewRef = useRef(null);
  // Load user data on mount
  useEffect(() => {
    loadUserData();
  }, []);

  // Load diary entries when user data is available
  useEffect(() => {
    if (userPhone) {
      loadDiaryEntries();
    }
  }, [userPhone]);

  const loadUserData = async () => {
    try {
      const storedPhone = await AsyncStorage.getItem("userPhone");
      if (storedPhone) {
        setUserPhone(storedPhone);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const loadDiaryEntries = async () => {
    try {
      const diaryRef = ref(
        database,
        `SmartMentalHealthApplication/users/${userPhone}/diary`
      );
      const snapshot = await get(diaryRef);

      if (snapshot.exists()) {
        const entries = [];
        snapshot.forEach((childSnapshot) => {
          entries.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
          });
        });

        // Sort entries by date (newest first)
        setDiaryEntries(
          entries.sort((a, b) => new Date(b.date) - new Date(a.date))
        );
      }
    } catch (error) {
      console.error("Error loading diary entries:", error);
    }
  };

  const addDiaryEntry = async () => {
    if (!entryTitle.trim()) {
      Alert.alert("Error", "Please enter a title for your diary entry.");
      return;
    }

    if (!entryContent.trim()) {
      Alert.alert("Error", "Please enter some content for your diary entry.");
      return;
    }

    try {
      const newEntry = {
        title: entryTitle,
        content: entryContent,
        mood: mood,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      const diaryRef = ref(
        database,
        `SmartMentalHealthApplication/users/${userPhone}/diary`
      );
      const newEntryRef = push(diaryRef);
      await set(newEntryRef, newEntry);

      // Reset form and close modal
      resetForm();
      setShowAddModal(false);

      // Reload diary entries
      loadDiaryEntries();
    } catch (error) {
      console.error("Error adding diary entry:", error);
      Alert.alert("Error", "Failed to save diary entry. Please try again.");
    }
  };

  const updateDiaryEntry = async () => {
    if (!entryTitle.trim() || !entryContent.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    try {
      const updatedEntry = {
        ...currentEntry,
        title: entryTitle,
        content: entryContent,
        mood: mood,
        updatedAt: new Date().toISOString(),
      };

      const diaryEntryRef = ref(
        database,
        `SmartMentalHealthApplication/users/${userPhone}/diary/${currentEntry.id}`
      );
      await set(diaryEntryRef, updatedEntry);

      // Reset form and close modal
      resetForm();
      setShowViewModal(false);
      setIsEditMode(false);

      // Reload diary entries
      loadDiaryEntries();
    } catch (error) {
      console.error("Error updating diary entry:", error);
      Alert.alert("Error", "Failed to update diary entry. Please try again.");
    }
  };

  const deleteDiaryEntry = async () => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this diary entry? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const diaryEntryRef = ref(
                database,
                `SmartMentalHealthApplication/users/${userPhone}/diary/${currentEntry.id}`
              );
              await remove(diaryEntryRef);

              // Reset form and close modal
              resetForm();
              setShowViewModal(false);
              setIsEditMode(false);

              // Reload diary entries
              loadDiaryEntries();
            } catch (error) {
              console.error("Error deleting diary entry:", error);
              Alert.alert(
                "Error",
                "Failed to delete diary entry. Please try again."
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const resetForm = () => {
    setEntryTitle("");
    setEntryContent("");
    setMood("neutral");
    setCurrentEntry(null);
  };

  const handleViewEntry = (entry) => {
    setCurrentEntry(entry);
    setEntryTitle(entry.title);
    setEntryContent(entry.content);
    setMood(entry.mood || "neutral");
    setShowViewModal(true);
    setCurrentPage(0);
  };

  const handleEditEntry = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    if (currentEntry) {
      setEntryTitle(currentEntry.title);
      setEntryContent(currentEntry.content);
      setMood(currentEntry.mood || "neutral");
    }
    setIsEditMode(false);
  };

  const formatDate = (dateString) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (dateString) => {
    const options = { hour: "2-digit", minute: "2-digit" };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };

  const getMoodEmoji = (moodType) => {
    switch (moodType) {
      case "happy":
        return "😊";
      case "sad":
        return "😢";
      case "angry":
        return "😠";
      case "anxious":
        return "😰";
      case "grateful":
        return "🙏";
      case "excited":
        return "🤩";
      case "peaceful":
        return "😌";
      default:
        return "😐";
    }
  };

  const getMoodColor = (moodType) => {
    switch (moodType) {
      case "happy":
        return "#FFD700";
      case "sad":
        return "#87CEEB";
      case "angry":
        return "#FF6347";
      case "anxious":
        return "#9370DB";
      case "grateful":
        return "#90EE90";
      case "excited":
        return "#FF69B4";
      case "peaceful":
        return "#B0E0E6";
      default:
        return "#E0E0E0";
    }
  };

  const handlePageChange = (index) => {
    setCurrentPage(index);
  };

  const renderDiaryEntry = ({ item, index }) => (
    <TouchableOpacity
      style={styles.entryCard}
      onPress={() => handleViewEntry(item)}
    >
      <View style={styles.entryHeader}>
        <View
          style={[
            styles.moodIndicator,
            { backgroundColor: getMoodColor(item.mood) },
          ]}
        >
          <Text style={styles.moodEmoji}>{getMoodEmoji(item.mood)}</Text>
        </View>
        <View style={styles.entryTitleContainer}>
          <Text style={styles.entryTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
        </View>
      </View>
      <Text style={styles.entryPreview} numberOfLines={2}>
        {item.content}
      </Text>
    </TouchableOpacity>
  );

  const renderViewModal = () => {
    if (!currentEntry) return null;

    // Create an array of pages from the content
    // For simplicity, we'll just split by paragraph
    const contentLines = entryContent
      .split("\n")
      .filter((line) => line.trim().length > 0);
    const pagesContent = [];
    let currentPageContent = [];
    let currentLineCount = 0;

    contentLines.forEach((line) => {
      if (currentLineCount >= 10) {
        pagesContent.push(currentPageContent.join("\n"));
        currentPageContent = [line];
        currentLineCount = 1;
      } else {
        currentPageContent.push(line);
        currentLineCount++;
      }
    });

    if (currentPageContent.length > 0) {
      pagesContent.push(currentPageContent.join("\n"));
    }

    // If no content, add an empty page
    if (pagesContent.length === 0) {
      pagesContent.push("");
    }

    const totalPages = pagesContent.length;

    return (
      <Modal
        visible={showViewModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowViewModal(false);
          resetForm();
          setIsEditMode(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidView}
          >
            <ScrollView 
              ref={modalScrollViewRef} 
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.viewModalContent}>
                <View style={styles.viewModalHeader}>
                  <View style={styles.headerTopRow}>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => {
                        setShowViewModal(false);
                        resetForm();
                        setIsEditMode(false);
                      }}
                    >
                      <Text style={styles.closeButtonText}>×</Text>
                    </TouchableOpacity>

                    <Text style={styles.viewModalTitle}>
                      {isEditMode ? "Edit Entry" : "Diary Entry"}
                    </Text>

                    <View style={styles.headerTopRight}>
                      {/* Empty view for balance */}
                      <View style={styles.closeButton} />
                    </View>
                  </View>

                  <View style={styles.moodSection}>
                    <Text style={styles.moodLabel}>Mood:</Text>
                    {isEditMode ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.moodSelectorScroll}
                        contentContainerStyle={styles.moodSelectorContainer}
                      >
                        {[
                          "happy",
                          "sad",
                          "angry",
                          "anxious",
                          "grateful",
                          "excited",
                          "peaceful",
                          "neutral",
                        ].map((moodType) => (
                          <TouchableOpacity
                            key={moodType}
                            style={[
                              styles.moodOption,
                              { backgroundColor: getMoodColor(moodType) },
                              mood === moodType && styles.selectedMoodOption,
                            ]}
                            onPress={() => setMood(moodType)}
                          >
                            <Text style={styles.moodEmoji}>
                              {getMoodEmoji(moodType)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <View
                        style={[
                          styles.moodDisplay,
                          { backgroundColor: getMoodColor(mood) },
                        ]}
                      >
                        <Text style={styles.moodEmoji}>{getMoodEmoji(mood)}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.entryActions}>
                    {isEditMode ? (
                      <>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={handleCancelEdit}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={updateDiaryEntry}
                        >
                          <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={handleEditEntry}
                        >
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={deleteDiaryEntry}
                        >
                          <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>

                {isEditMode ? (
                  <ScrollView 
                    ref={editScrollViewRef}
                    style={styles.editContainer}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.editContentContainer}
                  >
                    <Text style={styles.inputLabel}>Title</Text>
                    <TextInput
                      style={styles.titleInput}
                      value={entryTitle}
                      onChangeText={setEntryTitle}
                      placeholder="Enter title..."
                      maxLength={50}
                    />

                    <Text style={styles.inputLabel}>Entry</Text>
                    <TextInput
                      style={styles.contentInput}
                      value={entryContent}
                      onChangeText={setEntryContent}
                      placeholder="Write your thoughts here..."
                      multiline
                      textAlignVertical="top"
                    />
                    <View style={styles.spacer} />
                  </ScrollView>
                ) : (
                  <View style={styles.viewContainer}>
                    <View style={styles.diaryHeader}>
                      <Text style={styles.diaryTitle}>{entryTitle}</Text>
                      <Text style={styles.diaryDate}>
                        {formatDate(currentEntry.date)}
                      </Text>
                      <Text style={styles.diaryTime}>
                        {formatTime(currentEntry.date)}
                      </Text>
                    </View>

                    <View style={styles.paginationContainer}>
                      <FlatList
                        ref={flatListRef}
                        data={pagesContent}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(_, index) => `page-${index}`}
                        onMomentumScrollEnd={(event) => {
                          const index = Math.floor(
                            event.nativeEvent.contentOffset.x / pageWidth
                          );
                          handlePageChange(index);
                        }}
                        renderItem={({ item, index }) => (
                          <View style={styles.pageContainer}>
                            <View style={styles.page}>
                              <ScrollView 
                                style={styles.pageScrollView}
                                showsVerticalScrollIndicator={true}
                              >
                                <Text style={styles.pageContent}>{item}</Text>
                              </ScrollView>
                              <Text style={styles.pageNumber}>{index + 1}</Text>
                            </View>
                          </View>
                        )}
                      />
                    </View>

                    <View style={styles.pageIndicator}>
                      <Text style={styles.pageIndicatorText}>
                        Page {currentPage + 1} of {totalPages}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  };

  const renderAddModal = () => (
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Diary Entry</Text>

            <View style={styles.moodSelectorContainer}>
              <Text style={styles.moodSelectorLabel}>
                How are you feeling today?
              </Text>
              <View style={styles.moodSelector}>
                {[
                  "happy",
                  "sad",
                  "angry",
                  "anxious",
                  "grateful",
                  "excited",
                  "peaceful",
                  "neutral",
                ].map((moodType) => (
                  <TouchableOpacity
                    key={moodType}
                    style={[
                      styles.moodOption,
                      { backgroundColor: getMoodColor(moodType) },
                      mood === moodType && styles.selectedMoodOption,
                    ]}
                    onPress={() => setMood(moodType)}
                  >
                    <Text style={styles.moodEmoji}>
                      {getMoodEmoji(moodType)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.titleInput}
              value={entryTitle}
              onChangeText={setEntryTitle}
              placeholder="Enter a title for your entry..."
              maxLength={50}
            />

            <Text style={styles.inputLabel}>Entry</Text>
            <TextInput
              style={styles.contentInput}
              value={entryContent}
              onChangeText={setEntryContent}
              placeholder="Write your thoughts, feelings, and experiences..."
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSaveButton,
                  (!entryTitle.trim() || !entryContent.trim()) &&
                    styles.modalSaveButtonDisabled,
                ]}
                onPress={addDiaryEntry}
                disabled={!entryTitle.trim() || !entryContent.trim()}
              >
                <Text style={styles.modalSaveButtonText}>Save Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  const renderEmptyDiary = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={require("../assets/empty-diary.png")}
        style={styles.emptyImage}
        defaultSource={require("../assets/empty-diary.png")}
      />
      <Text style={styles.emptyTitle}>Your Diary is Empty</Text>
      <Text style={styles.emptyText}>
        Start journaling your thoughts and feelings to improve your mental
        well-being. Regular journaling can help you process emotions and gain
        insights into patterns in your life.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.emptyButtonText}>Create First Entry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#795548", "#4E342E"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigateTo("dashboard")}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Personal Diary</Text>
        </View>
      </LinearGradient>

      {diaryEntries.length > 0 ? (
        <View style={styles.content}>
          <View style={styles.diaryContainer}>
            <View style={styles.entriesHeader}>
              <Text style={styles.entriesTitle}>Your Entries</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.addButtonText}>+ New Entry</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={diaryEntries}
              renderItem={renderDiaryEntry}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.entriesList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      ) : (
        renderEmptyDiary()
      )}

      {renderAddModal()}
      {renderViewModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    flex: 1,
    padding: 15,
  },
  diaryContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  entriesTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4E342E",
  },
  addButton: {
    backgroundColor: "#795548",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  entriesList: {
    paddingBottom: 20,
  },
  entryCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  entryHeader: {
    flexDirection: "row",
    marginBottom: 10,
  },
  moodIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  moodEmoji: {
    fontSize: 20,
  },
  entryTitleContainer: {
    flex: 1,
    justifyContent: "center",
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  entryDate: {
    fontSize: 12,
    color: "#888",
  },
  entryPreview: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  emptyContainerScroll: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
    resizeMode: "contain",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4E342E",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: "#795548",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardAvoidView: {
    width: "100%",
    alignItems: "center",
    maxHeight: "90%",
  },
  addModalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 15,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 15,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
   
    width: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4E342E",
    marginBottom: 15,
    textAlign: "center",
  },
  moodSelectorContainer: {
    marginBottom: 15,
  },
  moodSelectorInnerContainer: {
    paddingVertical: 5,
    flexDirection: "row",
  },
  moodSelectorLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  moodSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  moodOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
  },
  selectedMoodOption: {
    borderWidth: 2,
    borderColor: "#4E342E",
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  contentInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    minHeight: 200,
    maxHeight: 400,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    marginRight: 10,
  },
  modalCancelButtonText: {
    color: "#795548",
    fontSize: 16,
    fontWeight: "600",
  },
  modalSaveButton: {
    flex: 2,
    backgroundColor: "#795548",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalSaveButtonDisabled: {
    backgroundColor: "#BDBDBD",
  },
  modalSaveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  viewModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxHeight: "100%",
    flex: 1,
  },
  viewModalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 20,
    color: "#333",
    fontWeight: "bold",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  headerTopRight: {
    width: 32, // Same as closeButton for balance
    opacity: 0, // Make it invisible
  },
  viewModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4E342E",
    textAlign: "center",
  },
  moodSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  moodLabel: {
    fontSize: 14,
    color: "#333",
    marginRight: 8,
  },
  moodSelectorScroll: {
    flex: 1,
  },
  moodSelectorContainer: {
    paddingVertical: 5,
  },
  moodDisplay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  entryActions: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  editButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#E0E0E0",
    marginRight: 16,
  },
  editButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  deleteButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#FFEBEE",
  },
  deleteButtonText: {
    color: "#D32F2F",
    fontWeight: "600",
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#E0E0E0",
    marginRight: 16,
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#795548",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  editContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: height * 0.6,
  },
  editContentContainer: {
    paddingBottom: 50,
  },
  viewContainer: {
    flex: 1,
    padding: 15,
  },
  diaryHeader: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingBottom: 10,
  },
  diaryTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4E342E",
    marginBottom: 5,
  },
  diaryDate: {
    fontSize: 14,
    color: "#757575",
  },
  diaryTime: {
    fontSize: 12,
    color: "#9E9E9E",
    marginTop: 2,
  },
  paginationContainer: {
    height: pageHeight,
    width: "100%",
  },
  pageContainer: {
    width: pageWidth,
    height: pageHeight,
    paddingHorizontal: 5,
  },
  page: {
    flex: 1,
    backgroundColor: "#FFF9C4",
    borderRadius: 8,
    padding: 15,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  pageScrollView: {
    flex: 1,
    marginBottom: 15,
  },
  pageContent: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
  },
  pageNumber: {
    position: "absolute",
    bottom: 10,
    right: 15,
    fontSize: 12,
    color: "#9E9E9E",
  },
  pageIndicator: {
    marginTop: 15,
    alignItems: "center",
  },
  pageIndicatorText: {
    fontSize: 14,
    color: "#757575",
  },
  spacer: {
    height: 50,
  },
});

export default DiaryScreen;
