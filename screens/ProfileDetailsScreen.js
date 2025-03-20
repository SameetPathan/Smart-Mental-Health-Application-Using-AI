import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const ProfileDetailsScreen = ({ 
  visible, 
  onClose, 
  userData, 
  assessmentCompleted, 
  onEditProfile, 
  onTakeAssessment 
}) => {
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const getAssessmentSummary = () => {
    if (!userData.assessment || !userData.assessment.responses) {
      return "Assessment not completed";
    }
    
    // Convert assessment responses to summary
    const responses = userData.assessment.responses;
    const totalQuestions = Object.keys(responses).length;
    
    let summary = '';
    if (totalQuestions > 0) {
      const anxietyLevel = responses[0] === "Not at all" ? "Low" : 
                       responses[0] === "Several days" ? "Mild" :
                       responses[0] === "More than half the days" ? "Moderate" : "High";
      
      const depressionLevel = responses[1] === "Not at all" ? "Low" : 
                          responses[1] === "Several days" ? "Mild" :
                          responses[1] === "More than half the days" ? "Moderate" : "High";
      
      summary = `Anxiety: ${anxietyLevel}, Depression: ${depressionLevel}`;
    }
    
    return summary;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          style={styles.profileModalContent}
          borderRadius={20}
        >
          <View style={styles.profileModalHeader}>
            <LinearGradient
              colors={['#43A047', '#2E7D32']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileHeaderGradient}
            >
              <View style={styles.profileAvatarContainer}>
                <LinearGradient
                  colors={['#4CAF50', '#2E7D32']}
                  style={styles.profileAvatar}
                  borderRadius={50}
                >
                  <Text style={styles.profileInitials}>
                    {getInitials(userData.username)}
                  </Text>
                </LinearGradient>
                <Text style={styles.profileName}>{userData.username}</Text>
                <View style={styles.profileBadge}>
                  <Text style={styles.profileBadgeText}>
                    {assessmentCompleted ? 'Assessment Complete' : 'New User'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
            
            <TouchableOpacity 
              style={styles.closeProfileButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.profileScrollView}>
            <View style={styles.profileTabsContainer}>
              <View style={styles.profileTabs}>
                <TouchableOpacity style={[styles.profileTab, styles.activeProfileTab]}>
                  <Text style={[styles.profileTabText, styles.activeProfileTabText]}>Profile</Text>
                </TouchableOpacity>

              </View>
            </View>
            
            <View style={styles.profileSection}>
              <View style={styles.profileSectionHeader}>
                <View style={styles.profileSectionIconContainer}>
                  <Text style={styles.profileSectionIcon}>👤</Text>
                </View>
                <Text style={styles.profileSectionTitle}>Personal Information</Text>
              </View>
              
              <View style={styles.profileCard}>
                <View style={styles.profileInfoRow}>
                  <Text style={styles.profileInfoLabel}>Email</Text>
                  <Text style={styles.profileInfoValue}>{userData.email || 'Not provided'}</Text>
                </View>
                <View style={styles.profileInfoDivider} />
                
                <View style={styles.profileInfoRow}>
                  <Text style={styles.profileInfoLabel}>Phone</Text>
                  <Text style={styles.profileInfoValue}>{userData.phoneNumber || 'Not provided'}</Text>
                </View>
                <View style={styles.profileInfoDivider} />
                
                <View style={styles.profileInfoRow}>
                  <Text style={styles.profileInfoLabel}>Address</Text>
                  <Text style={styles.profileInfoValue}>{userData.address || 'Not provided'}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.profileSection}>
              <View style={styles.profileSectionHeader}>
                <View style={styles.profileSectionIconContainer}>
                  <Text style={styles.profileSectionIcon}>💪</Text>
                </View>
                <Text style={styles.profileSectionTitle}>Health Information</Text>
              </View>
              
              <View style={styles.profileCard}>
                <View style={styles.profileStatsContainer}>
                  <View style={styles.profileStatItem}>
                    <Text style={styles.profileStatValue}>{userData.health?.age || '--'}</Text>
                    <Text style={styles.profileStatLabel}>Age</Text>
                  </View>
                  <View style={styles.profileStatDivider} />
                  
                  <View style={styles.profileStatItem}>
                    <Text style={styles.profileStatValue}>{userData.health?.weight || '--'}</Text>
                    <Text style={styles.profileStatLabel}>Weight (kg)</Text>
                  </View>
                  <View style={styles.profileStatDivider} />
                  
                  <View style={styles.profileStatItem}>
                    <Text style={styles.profileStatValue}>{userData.health?.height || '--'}</Text>
                    <Text style={styles.profileStatLabel}>Height (cm)</Text>
                  </View>
                </View>
                
                <View style={styles.profileInfoDivider} />
                
                <View style={styles.profileInfoRow}>
                  <Text style={styles.profileInfoLabel}>Gender</Text>
                  <View style={styles.genderBadge}>
                    <Text style={styles.genderBadgeText}>{userData.health?.gender || 'Not specified'}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.profileSection}>
              <View style={styles.profileSectionHeader}>
                <View style={styles.profileSectionIconContainer}>
                  <Text style={styles.profileSectionIcon}>🧠</Text>
                </View>
                <Text style={styles.profileSectionTitle}>Mental Health Profile</Text>
              </View>
              
              <View style={styles.profileCard}>
                <View style={styles.profileInfoRow}>
                  <Text style={styles.profileInfoLabel}>Relationship Status</Text>
                  <View style={styles.relationshipBadge}>
                    <Text style={styles.relationshipBadgeText}>{userData.profile?.relationshipStatus || 'Not specified'}</Text>
                  </View>
                </View>
                
                <View style={styles.profileInfoDivider} />
                
                <Text style={styles.challengesLabel}>Mental Health Challenges</Text>
                
                <View style={styles.challengesContainer}>
                  {userData.profile?.mentalHealthChallenges && userData.profile.mentalHealthChallenges.length > 0 ?
                    userData.profile.mentalHealthChallenges.map((challenge, index) => (
                      <View key={index} style={styles.challengeTag}>
                        <Text style={styles.challengeTagText}>{challenge}</Text>
                      </View>
                    )) :
                    <Text style={styles.noDataText}>No challenges selected</Text>
                  }
                </View>
              </View>
            </View>
            
            <View style={styles.profileSection}>
              <View style={styles.profileSectionHeader}>
                <View style={styles.profileSectionIconContainer}>
                  <Text style={styles.profileSectionIcon}>📊</Text>
                </View>
                <Text style={styles.profileSectionTitle}>Assessment Results</Text>
              </View>
              
              {userData.assessment && userData.assessment.completed ? (
                <View style={styles.profileCard}>
                  <View style={styles.assessmentResultsContainer}>
                    <View style={styles.assessmentResultItem}>
                      <Text style={styles.assessmentResultTitle}>Anxiety Level</Text>
                      <View style={[
                        styles.assessmentResultIndicator,
                        getAssessmentSummary().includes('Anxiety: High') 
                          ? styles.assessmentLevelHigh 
                          : getAssessmentSummary().includes('Anxiety: Moderate')
                            ? styles.assessmentLevelMedium
                            : styles.assessmentLevelLow
                      ]}>
                        <Text style={styles.assessmentResultLevel}>
                          {getAssessmentSummary().split(',')[0].replace('Anxiety: ', '')}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.assessmentResultDivider} />
                    
                    <View style={styles.assessmentResultItem}>
                      <Text style={styles.assessmentResultTitle}>Depression Level</Text>
                      <View style={[
                        styles.assessmentResultIndicator,
                        getAssessmentSummary().split(',')[1]?.includes('High') 
                          ? styles.assessmentLevelHigh 
                          : getAssessmentSummary().split(',')[1]?.includes('Moderate')
                            ? styles.assessmentLevelMedium
                            : styles.assessmentLevelLow
                      ]}>
                        <Text style={styles.assessmentResultLevel}>
                          {getAssessmentSummary().split(',')[1]?.replace(' Depression: ', '') || 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.viewDetailsButton}
                    onPress={onTakeAssessment}
                  >
                    <Text style={styles.viewDetailsButtonText}>View Full Assessment</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.profileCard}>
                  <View style={styles.noAssessmentContainer}>
                    <Text style={styles.noAssessmentText}>You haven't completed your assessment yet</Text>
                    <Text style={styles.noAssessmentSubtext}>Complete your assessment to get personalized recommendations</Text>
                    
                    <TouchableOpacity 
                      style={styles.takeAssessmentButton}
                      onPress={onTakeAssessment}
                    >
                      <LinearGradient
                        colors={['#43A047', '#2E7D32']}
                        style={styles.takeAssessmentGradient}
                        borderRadius={12}
                      >
                        <Text style={styles.takeAssessmentButtonText}>Take Assessment</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.editProfileButton}
              onPress={onEditProfile}
            >
              <LinearGradient
                colors={['#43A047', '#2E7D32']}
                style={styles.editProfileGradient}
                borderRadius={12}
              >
                <Text style={styles.editProfileButtonText}>Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closeButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  profileModalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
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
  profileModalHeader: {
    position: 'relative',
  },
  profileHeaderGradient: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  profileAvatarContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.6)',
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
  profileInitials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  profileBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  profileBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  closeProfileButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  profileScrollView: {
    padding: 0,
  },
  profileTabsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  profileTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 15,
  },
  profileTab: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginRight: 10,
  },
  activeProfileTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#43A047',
  },
  profileTabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  activeProfileTabText: {
    color: '#43A047',
    fontWeight: 'bold',
  },
  profileSection: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  profileSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileSectionIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  profileSectionIcon: {
    fontSize: 16,
  },
  profileSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
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
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  profileInfoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  profileInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  profileInfoDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 5,
  },
  profileStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
  },
  profileStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  profileStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  genderBadge: {
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  genderBadgeText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  relationshipBadge: {
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  relationshipBadgeText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  challengesLabel: {
    fontSize: 14,
    color: '#666',
    marginVertical: 10,
  },
  challengesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  challengeTag: {
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.2)',
  },
  challengeTagText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '500',
  },
  noDataText: {
    color: '#999',
    fontStyle: 'italic',
    fontSize: 14,
    marginTop: 5,
  },
  assessmentResultsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  assessmentResultItem: {
    flex: 1,
    alignItems: 'center',
  },
  assessmentResultTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  assessmentResultIndicator: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  assessmentLevelLow: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  assessmentLevelMedium: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  assessmentLevelHigh: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  assessmentResultLevel: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  assessmentResultDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
  },
  viewDetailsButton: {
    alignSelf: 'center',
    marginTop: 15,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.2)',
  },
  viewDetailsButtonText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 14,
  },
  noAssessmentContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noAssessmentText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noAssessmentSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  takeAssessmentButton: {
    width: '80%',
    marginTop: 10,
  },
  takeAssessmentGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  takeAssessmentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editProfileButton: {
    marginHorizontal: 15,
    marginVertical: 25,
  },
  editProfileGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  editProfileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileDetailsScreen;