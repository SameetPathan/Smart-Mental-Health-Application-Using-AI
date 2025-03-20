import React, { useState } from 'react';
import { 
  StyleSheet, 
  Platform, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../firebaseConfig';
import { ref, get, child } from 'firebase/database';

const LoginScreen = ({ navigateTo, setIsLoggedIn }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    let isValid = true;
    let newErrors = {};

    // Phone number validation
    const phoneRegex = /^\d{10}$/;
    if (!phoneNumber || !phoneRegex.test(phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid 10-digit phone number';
      isValid = false;
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // Check if user exists in the database with the provided phone number
    const dbRef = ref(database);
    get(child(dbRef, `SmartMentalHealthApplication/users/${phoneNumber}`))
      .then((snapshot) => {
        setIsLoading(false);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          
          // Verify password
          if (userData.password === password) {
            // Store login info
            AsyncStorage.setItem('userPhone', phoneNumber)
              .then(() => {
                setIsLoggedIn(true);
                navigateTo('dashboard');
                Alert.alert('Success', 'Login successful!');
              })
              .catch((error) => {
                Alert.alert('Error', 'Failed to save login status: ' + error.message);
              });
          } else {
            Alert.alert('Error', 'Incorrect password');
          }
        } else {
          Alert.alert('Error', 'User not found. Please register first.');
        }
      })
      .catch((error) => {
        setIsLoading(false);
        Alert.alert('Error', 'Login failed: ' + error.message);
      });
  };

  return (
    <LinearGradient
      colors={['#43A047', '#1B5E20']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientContainer}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidContainer}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigateTo('landing')}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            
            <View style={styles.headerContainer}>
              
              <Text style={styles.formTitle}>Welcome Back</Text>
              <Text style={styles.formSubtitle}>Sign in to continue your wellness journey</Text>
            </View>
            
            <LinearGradient
              colors={['#ffffff', '#f7f9fc']}
              style={styles.formGradient}
              borderRadius={15}
            >
              <View style={styles.formContainer}>
                {/* Phone Number field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={[styles.inputWrapper, errors.phoneNumber && styles.inputWrapperError]}>
                    <Text style={styles.countryCode}>+91</Text>
                    <TextInput
                      style={styles.input}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholder="Enter your phone number"
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                  {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
                </View>
                
                {/* Password field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={[styles.passwordInputWrapper, errors.password && styles.inputWrapperError]}>
                    <TextInput
                      style={styles.passwordInput}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      secureTextEntry
                    />
                  </View>
                  {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>
                
              
                
                <LinearGradient
                  colors={['#43A047', '#2E7D32']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  borderRadius={8}
                >
                  <TouchableOpacity 
                    style={styles.primaryButton}
                    onPress={handleLogin}
                    disabled={isLoading}
                  >
                    <Text style={styles.buttonText}>
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
                
                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.divider} />
                </View>
                
                <TouchableOpacity 
                  style={styles.registerButton}
                  onPress={() => navigateTo('register')}
                >
                  <Text style={styles.registerButtonText}>Create New Account</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
            
           
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 50,
    minHeight: '100%',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 40,
    padding: 10,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },
  formGradient: {
    borderRadius: 15,
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
  formContainer: {
    borderRadius: 15,
    padding: 25,
    overflow: 'hidden',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    color: '#555',
    marginBottom: 8,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F8FA',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    overflow: 'hidden',
  },
  inputWrapperError: {
    borderColor: '#f44336',
    borderWidth: 1.5,
  },
  countryCode: {
    backgroundColor: '#e8f5e9',
    padding: 14,
    color: '#2E7D32',
    fontWeight: 'bold',
    borderRightWidth: 1,
    borderRightColor: '#DDD',
    minWidth: 50,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  passwordInputWrapper: {
    backgroundColor: '#F5F8FA',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    overflow: 'hidden',
  },
  passwordInput: {
    padding: 12,
    fontSize: 16,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: 5,
  },
  forgotPasswordText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 2,
  },
  buttonGradient: {
    borderRadius: 8,
    marginVertical: 5,
  },
  primaryButton: {
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDD',
  },
  dividerText: {
    paddingHorizontal: 15,
    color: '#999',
    fontWeight: '500',
  },
  registerButton: {
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  helpText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
});

export default LoginScreen;