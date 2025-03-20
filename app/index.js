import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LandingScreen from "../screens/LandingScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DashboardScreen from "../screens/DashboardScreen";
import MindNestScreen from "../screens/MindNestScreen";
import ChatbotScreen from "../screens/ChatbotScreen";
import GamesScreen from "../screens/GamesScreen";
import DiaryScreen from "../screens/DiaryScreen";
import CommunityScreen from "../screens/CommunityScreen";
import HealthSuggestionsScreen from "../screens/HealthSuggestionsScreen";
import EducationalResourcesScreen from "../screens/EducationalResourcesScreen";
import TherapistConsultationScreen from "../screens/TherapistConsultationScreen";
import TherapistAdminScreen from "../screens/TherapistAdminScreen";

// import ProfileDetailsScreen from '../screens/ProfileDetailsScreen';
// Note: You don't need to import it here as it's used within DashboardScreen

export default function App() {
  const [currentPage, setCurrentPage] = useState("landing");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const userEmail = await AsyncStorage.getItem("userEmail");
      if (userEmail) {
        setIsLoggedIn(true);
        setCurrentPage("dashboard");
      }
    } catch (error) {
      console.error("Error checking login status:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("userEmail");
      setIsLoggedIn(false);
      setCurrentPage("landing");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Render the appropriate page based on state
  switch (currentPage) {
    case "landing":
      return <LandingScreen navigateTo={setCurrentPage} />;
    case "login":
      return (
        <LoginScreen
          navigateTo={setCurrentPage}
          setIsLoggedIn={setIsLoggedIn}
        />
      );
    case "register":
      return <RegisterScreen navigateTo={setCurrentPage} />;
    case "dashboard":
      return (
        <DashboardScreen
          handleLogout={handleLogout}
          navigateTo={setCurrentPage}
        />
      );
    case "mindnest":
      return <MindNestScreen navigateTo={setCurrentPage} />;
    case "chatbot":
      return <ChatbotScreen navigateTo={setCurrentPage} />;
    case "games":
      return <GamesScreen navigateTo={setCurrentPage} />;
    case "diary":
      return <DiaryScreen navigateTo={setCurrentPage} />;
    case "community":
      return <CommunityScreen navigateTo={setCurrentPage} />;
    case "health":
      return <HealthSuggestionsScreen navigateTo={setCurrentPage} />;
    case "resources":
      return <EducationalResourcesScreen navigateTo={setCurrentPage} />;
    case "therapist":
      return <TherapistConsultationScreen navigateTo={setCurrentPage} />;
    case "therapistdoctor":
      return <TherapistAdminScreen navigateTo={setCurrentPage}/>

    default:
      return <LandingScreen navigateTo={setCurrentPage} />;
  }
}
