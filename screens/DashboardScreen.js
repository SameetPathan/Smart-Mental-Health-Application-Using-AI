import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Platform,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "../firebaseConfig";
import { ref, get, update } from "firebase/database";

// Import the separate ProfileDetailsScreen component
import ProfileDetailsScreen from "./ProfileDetailsScreen";
import MindNestScreen from "./MindNestScreen";

const { width } = Dimensions.get("window");
const cardWidth = width / 2 - 25;


const therapistPhoneNumbers = [
  "9975777709", 
  "9876543210", 
  "5555555555", 
];

const DashboardScreen = ({ handleLogout, navigateTo }) => {
  const [userData, setUserData] = useState({
    username: "User",
    email: "",
    phoneNumber: "",
    address: "",
    health: {
      age: "",
      gender: "",
      height: "",
      weight: "",
    },
    profile: {
      relationshipStatus: "",
      mentalHealthChallenges: [],
    },
    assessment: {
      completed: false,
      responses: {},
    },
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [isTherapist, setIsTherapist] = useState(false);

  useEffect(() => {
    loadUserData();
    checkProfileCompletion();
  }, []);

  const loadUserData = async () => {
    try {
      const storedPhone = await AsyncStorage.getItem("userPhone");
      if (storedPhone) {
        // Check if user is a therapist
        const userIsTherapist = therapistPhoneNumbers.includes(storedPhone);
        setIsTherapist(userIsTherapist);
        
        // Fetch user data from Firebase
        const userRef = ref(
          database,
          `SmartMentalHealthApplication/users/${storedPhone}`
        );
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          setUserData({
            ...userData,
            ...data,
            phoneNumber: storedPhone,
            profile: data.profile || {
              relationshipStatus: "",
              mentalHealthChallenges: [],
            },
            assessment: data.assessment || {
              completed: false,
              responses: {},
            },
          });

          // Check if assessment is completed
          if (data.assessment && data.assessment.completed) {
            setAssessmentCompleted(true);
          }
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const checkProfileCompletion = async () => {
    try {
      const isCompleted = await AsyncStorage.getItem("profileCompleted");
      setProfileCompleted(isCompleted === "true");

      // If profile not completed, show the modal
      if (isCompleted !== "true") {
        setShowProfileModal(true);
      }
    } catch (error) {
      console.error("Error checking profile completion:", error);
    }
  };

  const completeProfile = async (
    relationshipStatus,
    mentalHealthChallenges
  ) => {
    try {
      // Update Firebase with relationship status and mental health challenges
      if (userData.phoneNumber) {
        const userRef = ref(
          database,
          `SmartMentalHealthApplication/users/${userData.phoneNumber}/profile`
        );
        await update(userRef, {
          relationshipStatus,
          mentalHealthChallenges,
          updatedAt: new Date().toISOString(),
        });

        // Update local state
        setUserData({
          ...userData,
          profile: {
            relationshipStatus,
            mentalHealthChallenges,
            updatedAt: new Date().toISOString(),
          },
        });
      }

      // Save profile completion status to AsyncStorage
      await AsyncStorage.setItem("profileCompleted", "true");
      setProfileCompleted(true);
      setShowProfileModal(false);

      // Show assessment modal after profile completion
      setShowAssessmentModal(true);
    } catch (error) {
      console.error("Error completing profile:", error);
    }
  };

  const completeAssessment = async (assessmentResponses) => {
    try {
      // Update Firebase with assessment responses
      if (userData.phoneNumber) {
        const userRef = ref(
          database,
          `SmartMentalHealthApplication/users/${userData.phoneNumber}/assessment`
        );
        await update(userRef, {
          responses: assessmentResponses,
          completed: true,
          completedAt: new Date().toISOString(),
        });

        // Update local state
        setUserData({
          ...userData,
          assessment: {
            responses: assessmentResponses,
            completed: true,
            completedAt: new Date().toISOString(),
          },
        });
      }

      setAssessmentCompleted(true);
      setShowAssessmentModal(false);
    } catch (error) {
      console.error("Error completing assessment:", error);
    }
  };

  // Profile setup modal component
  const ProfileSetupModal = () => {
    const [relationship, setRelationship] = useState("");
    const [challenges, setChallenges] = useState([]);

    const toggleChallenge = (challenge) => {
      if (challenges.includes(challenge)) {
        setChallenges(challenges.filter((c) => c !== challenge));
      } else {
        setChallenges([...challenges, challenge]);
      }
    };

    return (
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Your Profile</Text>

            <Text style={styles.modalSectionTitle}>Relationship Status</Text>
            <View style={styles.optionsContainer}>
              {[
                "Single",
                "In a Relationship",
                "Married",
                "Divorced",
                "Widowed",
                "Prefer not to say",
              ].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.optionButton,
                    relationship === status && styles.selectedOption,
                  ]}
                  onPress={() => setRelationship(status)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      relationship === status && styles.selectedOptionText,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalSectionTitle}>
              Mental Health Challenges
            </Text>
            <Text style={styles.modalSubtitle}>Select all that apply</Text>
            <View style={styles.optionsContainer}>
              {[
                "Anxiety",
                "Depression",
                "Stress",
                "Sleep Issues",
                "Low Confidence",
                "Anger Management",
                "Relationship Issues",
                "General Wellbeing",
              ].map((challenge) => (
                <TouchableOpacity
                  key={challenge}
                  style={[
                    styles.optionButton,
                    challenges.includes(challenge) && styles.selectedOption,
                  ]}
                  onPress={() => toggleChallenge(challenge)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      challenges.includes(challenge) &&
                        styles.selectedOptionText,
                    ]}
                  >
                    {challenge}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.modalButton,
                (!relationship || challenges.length === 0) &&
                  styles.disabledButton,
              ]}
              onPress={() => completeProfile(relationship, challenges)}
              disabled={!relationship || challenges.length === 0}
            >
              <Text style={styles.modalButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Assessment modal component
  const AssessmentModal = () => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});

    useEffect(() => {
      // Prefill answers if they exist
      if (userData.assessment && userData.assessment.responses) {
        setAnswers(userData.assessment.responses);
      }
    }, []);

    // Sample questions based on common mental health assessments
    const questions = [
      {
        question:
          "How often have you felt nervous, anxious, or on edge in the last 2 weeks?",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day",
        ],
      },
      {
        question:
          "How often have you felt down, depressed, or hopeless in the last 2 weeks?",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day",
        ],
      },
      {
        question: "How would you rate your sleep quality overall?",
        options: ["Very good", "Fairly good", "Fairly bad", "Very bad"],
      },
      {
        question: "How often do you feel that you lack companionship?",
        options: ["Hardly ever", "Some of the time", "Often"],
      },
      {
        question: "How confident do you feel in social situations?",
        options: [
          "Very confident",
          "Somewhat confident",
          "Not very confident",
          "Not at all confident",
        ],
      },
    ];

    const handleAnswer = (answer) => {
      setAnswers({ ...answers, [currentQuestion]: answer });

      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        completeAssessment(answers);
      }
    };

    const getProgressPercentage = () => {
      return Math.round(((currentQuestion + 1) / questions.length) * 100);
    };

    return (
      <Modal
        visible={showAssessmentModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={["#ffffff", "#f7f9fc"]}
            style={styles.assessmentModalContent}
            borderRadius={20}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAssessmentModal(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Mental Health Assessment</Text>

            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${getProgressPercentage()}%` },
                ]}
              />
              <Text style={styles.assessmentProgress}>
                Question {currentQuestion + 1} of {questions.length}
              </Text>
            </View>

            <View style={styles.questionContainer}>
              <Text style={styles.questionNumber}>
                Question {currentQuestion + 1}
              </Text>
              <Text style={styles.questionText}>
                {questions[currentQuestion].question}
              </Text>
            </View>

            <View style={styles.answerContainer}>
              {questions[currentQuestion].options.map((option, index) => (
                <LinearGradient
                  key={index}
                  colors={
                    answers[currentQuestion] === option
                      ? ["#43A047", "#2E7D32"]
                      : ["#f5f5f5", "#e0e0e0"]
                  }
                  style={styles.answerGradient}
                  borderRadius={10}
                >
                  <TouchableOpacity
                    style={styles.answerButton}
                    onPress={() => handleAnswer(option)}
                  >
                    <Text
                      style={[
                        styles.answerText,
                        answers[currentQuestion] === option &&
                          styles.selectedAnswerText,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              ))}
            </View>

            <View style={styles.assessmentNavigation}>
              {currentQuestion > 0 && (
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => setCurrentQuestion(currentQuestion - 1)}
                >
                  <Text style={styles.navButtonText}>Previous</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => setShowAssessmentModal(false)}
              >
                <Text style={styles.skipButtonText}>Save & Exit</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    );
  };

  // Handler functions for ProfileDetailsScreen
  const handleEditProfile = () => {
    setShowProfileDetails(false);
    setShowProfileModal(true);
  };

  const handleTakeAssessment = () => {
    setShowProfileDetails(false);
    setShowAssessmentModal(true);
  };

  // Helper function to get user initials for avatar
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  // Filter sections based on whether user is a therapist
  const filteredFeatureSections = featureSections.filter(section => {
    // Only show "therapistdoctor" section if user is a therapist
    if (section.id === "therapistdoctor") {
      return isTherapist;
    }
    // Show all other sections to everyone
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#43A047", "#1B5E20"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.2 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{userData.username}</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowProfileDetails(true)}
              style={[styles.logoutButton, { marginRight: 10 }]}
            >
              <Text style={styles.logoutText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!assessmentCompleted && !isTherapist && (
          <TouchableOpacity
            style={styles.assessmentBanner}
            onPress={() => setShowAssessmentModal(true)}
          >
            <Text style={styles.assessmentBannerText}>
              Complete your mental health assessment to get personalized
              recommendations
            </Text>
            <Text style={styles.assessmentBannerCta}>Take Assessment →</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        <View style={styles.featuresGrid}>
          {filteredFeatureSections.map((section) => (
            <TouchableOpacity
              key={section.id}
              style={styles.featureCard}
              onPress={() => {
                if (section.id === "mindnest") {
                  navigateTo("mindnest");
                } else if (section.id === "chatbot") {
                  navigateTo("chatbot");
                } else if (section.id === "games") {
                  navigateTo("games");
                }
                else if(section.id === "diary") {
                  navigateTo("diary");
                }
                else if(section.id === "community") {
                  navigateTo("community");
                }
                else if(section.id === "health") {
                  navigateTo("health");
                }
                else if(section.id === "resources") {
                  navigateTo("resources");
                }
                else if(section.id === "therapistdoctor") {
                  navigateTo("therapistdoctor");
                }
                else if(section.id === "therapist") {
                  navigateTo("therapist");
                }
                else if(section.id === "therapistdoctor") {
                  navigateTo("therapistdoctor");
                }
              }}
            >
              <LinearGradient
                colors={section.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featureGradient}
              >
                <Text style={styles.featureIcon}>{section.icon}</Text>
                <Text style={styles.featureTitle}>{section.title}</Text>
                <Text style={styles.featureDescription}>
                  {section.description}
                </Text>

                <View style={styles.featureList}>
                  {section.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <View style={styles.featureDot} />
                      <Text style={styles.featureItemText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Modals */}
      <ProfileSetupModal />
      <AssessmentModal />

      {/* Use the separate ProfileDetailsScreen component */}
      <ProfileDetailsScreen
        visible={showProfileDetails}
        onClose={() => setShowProfileDetails(false)}
        userData={userData}
        assessmentCompleted={assessmentCompleted}
        onEditProfile={handleEditProfile}
        onTakeAssessment={handleTakeAssessment}
      />
    </SafeAreaView>
  );
};

const featureSections = [
  {
    id: "mindnest",
    title: "MindNest",
    icon: "📊",
    gradient: ["#4CAF50", "#2E7D32"],
    description: "Track your mood, sleep, and stress levels daily",
    features: [],
  },
  {
    id: "chatbot",
    title: "AI Chatbot",
    icon: "🤖",
    gradient: ["#2196F3", "#1565C0"],
    description: "Get instant support and answers to your questions",
    features: [],
  },
  {
    id: "therapist",
    title: "Consult a Therapist",
    icon: "👩‍⚕️",
    gradient: ["#9C27B0", "#6A1B9A"],
    description: "Connect with licensed mental health professionals",
    features: [],
  },
  {
    id: "games",
    title: "Stress Relief Games",
    icon: "🎮",
    gradient: ["#FF9800", "#E65100"],
    description: "Interactive mini-games to reduce stress and anxiety",
    features: [],
  },
  {
    id: "therapistdoctor",
    title: "Therapist/Admin",
    icon: "👩‍⚕️",
    gradient: ["#9C27B0", "#6A1B9A"],
    description: "Licensed mental health professionals",
    features: [],
  },
  {
    id: "diary",
    title: "Personal Diary",
    icon: "📔",
    gradient: ["#795548", "#4E342E"],
    description: "Journal your thoughts and feelings privately",
    features: [],
  },
  {
    id: "community",
    title: "Community",
    icon: "👥",
    gradient: ["#00BCD4", "#006064"],
    description: "Connect with others facing similar challenges",
    features: [],
  },
  {
    id: "health",
    title: "Health Suggestions",
    icon: "🥗",
    gradient: ["#8BC34A", "#558B2F"],
    description: "Get personalized diet and exercise recommendations",
    features: [],
  },
  {
    id: "resources",
    title: "Educational Resources",
    icon: "📚",
    gradient: ["#607D8B", "#37474F"],
    description: "Access valuable mental health resources",
    features: [],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingTop: Platform.OS === "android" ? 50 : 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  profileButton: {
    marginRight: 10,
  },
  avatarGradient: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "500",
  },
  assessmentBanner: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginTop: 15,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  assessmentBannerText: {
    color: "#fff",
    fontSize: 14,
  },
  assessmentBannerCta: {
    color: "#fff",
    fontWeight: "bold",
    marginTop: 5,
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  featureCard: {
    width: cardWidth,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  featureGradient: {
    padding: 16,
    height: 220,
    borderRadius: 16,
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 15,
  },
  featureList: {
    marginTop: "auto",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  featureDot: {
    width: 6,
    height: 6,
    backgroundColor: "#fff",
    borderRadius: 3,
    marginRight: 6,
  },
  featureItemText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
  },
  inspirationContainer: {
    marginBottom: 30,
  },
  inspirationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  quoteContainer: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "rgba(46, 125, 50, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(46, 125, 50, 0.2)",
  },
  quoteText: {
    fontSize: 16,
    color: "#333",
    fontStyle: "italic",
    lineHeight: 24,
    marginBottom: 10,
  },
  quoteAuthor: {
    fontSize: 14,
    color: "#555",
    textAlign: "right",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxHeight: "100%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 20,
    textAlign: "center",
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 15,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  optionButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: "#2E7D32",
  },
  optionText: {
    color: "#333",
    fontSize: 14,
  },
  selectedOptionText: {
    color: "#fff",
  },
  modalButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: "#cccccc",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  assessmentModalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#555",
    fontWeight: "bold",
  },
  progressBarContainer: {
    marginTop: 40,
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#2E7D32",
  },
  assessmentProgress: {
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionNumber: {
    color: "#2E7D32",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    color: "#333",
    marginBottom: 20,
    lineHeight: 26,
  },
  answerContainer: {
    width: "100%",
  },
  answerGradient: {
    marginBottom: 10,
    borderRadius: 10,
  },
  answerButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  answerText: {
    fontSize: 16,
    color: "#333",
  },
  selectedAnswerText: {
    color: "#fff",
    fontWeight: "600",
  },
  assessmentNavigation: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  navButton: {
    backgroundColor: "rgba(46, 125, 50, 0.1)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  navButtonText: {
    color: "#2E7D32",
    fontWeight: "600",
  },
  skipButton: {
    marginTop: 20,
    alignSelf: "center",
  },
  skipButtonText: {
    color: "#666",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

export default DashboardScreen;