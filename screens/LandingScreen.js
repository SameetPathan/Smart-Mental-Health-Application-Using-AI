import React from 'react';
import { 
  Image, 
  StyleSheet, 
  Platform, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Dimensions,
  ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const LandingScreen = ({ navigateTo }) => {
  const features = [
    {
      title: 'Track Your Mood',
      description: '',
      icon: '😊',
      gradient: ['#43A047', '#2E7D32']
    },
    {
      title: 'Guided Meditation',
      description: '',
      icon: '🧘',
      gradient: ['#26A69A', '#00796B']
    },
    {
      title: 'Connect With Professionals',
      description: '',
      icon: '👩‍⚕️',
      gradient: ['#66BB6A', '#388E3C']
    },
    {
      title: 'Daily Wellness Tips',
      description: '',
      icon: '💡',
      gradient: ['#81C784', '#4CAF50']
    }
  ];

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={{ uri: 'https://i.imgur.com/7LMhQQR.png' }} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(25, 118, 210, 0.8)', 'rgba(46, 125, 50, 0.9)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
        >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              <View style={styles.headerSection}>
                <View style={styles.logoContainer}>
                  <LinearGradient
                    colors={['#ffffff', '#f5f5f5']}
                    style={styles.logoBackground}
                    borderRadius={60}
                  >
                  
                  </LinearGradient>
                </View>
                
                <Text style={styles.appTitle}>PeacePulse</Text>
                <Text style={styles.subtitle}>Your companion for mental wellness</Text>
              </View>
              
              <View style={styles.featureSection}>
                <Text style={styles.sectionTitle}>Features</Text>
                
                <View style={styles.featureContainer}>
                  {features.map((feature, index) => (
                    <LinearGradient
                      key={index}
                      colors={feature.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.featureGradient}
                      borderRadius={16}
                    >
                      <View style={styles.feature}>
                        <Text style={styles.featureIcon}>{feature.icon}</Text>
                        <Text style={styles.featureTitle}>{feature.title}</Text>
                        <Text style={styles.featureText}>{feature.description}</Text>
                      </View>
                    </LinearGradient>
                  ))}
                </View>
              </View>
              
              <View style={styles.testimonialContainer}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
                  style={styles.testimonial}
                  borderRadius={16}
                >
                  <Text style={styles.testimonialText}>
                    "This app helped me track my emotions and develop better coping strategies. Highly recommended!"
                  </Text>
                  <Text style={styles.testimonialAuthor}>- Sarah K.</Text>
                </LinearGradient>
              </View>
              
              <View style={styles.buttonSection}>
                <LinearGradient
                  colors={['#43A047', '#2E7D32']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                  borderRadius={30}
                >
                  <TouchableOpacity 
                    style={styles.primaryButton}
                    onPress={() => navigateTo('login')}
                  >
                    <Text style={styles.buttonText}>Sign In</Text>
                  </TouchableOpacity>
                </LinearGradient>
                
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                  borderRadius={30}
                >
                  <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={() => navigateTo('register')}
                  >
                    <Text style={styles.secondaryButtonText}>Create Account</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
              
              <View style={styles.footer}>
                <Text style={styles.footerText}>Start your journey to better mental health today</Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 60 : 40,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    marginBottom: 15,
    borderRadius: 60,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  logoBackground: {
    padding: 3,
    borderRadius: 60,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  appTitle: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.9,
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    maxWidth: '80%',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  featureSection: {
    marginBottom: 25,
  },
  featureContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -5,
  },
  featureGradient: {
    width: width / 2 - 25,
    marginHorizontal: 5,
    marginBottom: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  feature: {
    padding: 18,
    borderRadius: 16,
    height: 180,
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  testimonialContainer: {
    marginBottom: 30,
  },
  testimonial: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  testimonialText: {
    fontSize: 16,
    color: '#ffffff',
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 10,
  },
  testimonialAuthor: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'right',
    fontWeight: '600',
  },
  buttonSection: {
    marginBottom: 20,
  },
  buttonGradient: {
    borderRadius: 30,
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  primaryButton: {
    padding: 18,
    alignItems: 'center',
    borderRadius: 30,
  },
  secondaryButton: {
    padding: 18,
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LandingScreen;