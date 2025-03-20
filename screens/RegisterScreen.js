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
  KeyboardAvoidingView,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { database } from '../firebaseConfig';
import { ref, set, get, child } from 'firebase/database';

const RegisterScreen = ({ navigateTo }) => {
  // User input states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  
  // Validation states
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    let isValid = true;
    let newErrors = {};

    // Username validation
    if (!username || username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
      isValid = false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // Password validation
    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    // Password confirmation
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    // Phone number validation
    const phoneRegex = /^\d{10}$/;
    if (!phoneNumber || !phoneRegex.test(phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid 10-digit phone number';
      isValid = false;
    }

    // Address validation
    if (!address || address.length < 5) {
      newErrors.address = 'Please enter a valid address';
      isValid = false;
    }

    // Age validation
    if (age && (isNaN(age) || parseInt(age) < 1 || parseInt(age) > 120)) {
      newErrors.age = 'Please enter a valid age between 1-120';
      isValid = false;
    }

    // Weight validation (optional)
    if (weight && (isNaN(weight) || parseFloat(weight) <= 0)) {
      newErrors.weight = 'Please enter a valid weight';
      isValid = false;
    }

    // Height validation (optional)
    if (height && (isNaN(height) || parseFloat(height) <= 0)) {
      newErrors.height = 'Please enter a valid height';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleRegister = () => {
    if (!validateForm()) {
      return;
    }

    // Check if user already exists with this phone number
    const dbRef = ref(database);
    get(child(dbRef, `SmartMentalHealthApplication/users/${phoneNumber}`))
      .then((snapshot) => {
        if (snapshot.exists()) {
          Alert.alert('Error', 'User already exists with this phone number');
        } else {
          // Save user to Firebase
          set(ref(database, `SmartMentalHealthApplication/users/${phoneNumber}`), {
            username: username,
            email: email,
            phoneNumber: phoneNumber,
            address: address,
            password:password,
            confirmPassword:confirmPassword,
            health: {
              age: age || '',
              gender: gender || '',
              height: height || '',
              weight: weight || ''
            },
            createdAt: new Date().toISOString()
          })
            .then(() => {
              Alert.alert('Success', 'Registration successful!', [
                { text: 'OK', onPress: () => navigateTo('login') }
              ]);
              // Reset form
              setUsername('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
              setPhoneNumber('');
              setAddress('');
              setAge('');
              setGender('');
              setHeight('');
              setWeight('');
              setErrors({});
            })
            .catch((error) => {
              Alert.alert('Error', 'Registration failed: ' + error.message);
            });
        }
      })
      .catch((error) => {
        Alert.alert('Error', 'Database error: ' + error.message);
      });
  };

  const renderGenderOptions = () => {
    const options = ['Male', 'Female', 'Other', 'Prefer not to say'];
    
    return (
      <View style={styles.genderContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.genderOption,
              gender === option && styles.genderOptionSelected
            ]}
            onPress={() => setGender(option)}
          >
            <Text 
              style={[
                styles.genderOptionText,
                gender === option && styles.genderOptionTextSelected
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
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
             
              <Text style={styles.formTitle}>Create Your Account</Text>
              <Text style={styles.formSubtitle}>Join our mental wellness community</Text>
            </View>
            
            <LinearGradient
              colors={['#ffffff', '#f7f9fc']}
              style={styles.formGradient}
              borderRadius={15}
            >
              <View style={styles.formContainer}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                
                {/* Username field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Username*</Text>
                  <TextInput
                    style={[styles.input, errors.username && styles.inputError]}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Choose a username"
                    autoCapitalize="none"
                  />
                  {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
                </View>
                
                {/* Email field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email*</Text>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>
                
                {/* Phone Number field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Phone Number*</Text>
                  <TextInput
                    style={[styles.input, errors.phoneNumber && styles.inputError]}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="Enter your 10-digit number"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
                </View>
                
                {/* Address field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Address*</Text>
                  <TextInput
                    style={[styles.input, errors.address && styles.inputError]}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Enter your address"
                    multiline
                    numberOfLines={2}
                  />
                  {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
                </View>
                
                <LinearGradient
                  colors={['#e8f5e9', '#c8e6c9']}
                  style={styles.sectionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.sectionTitle}>Account Security</Text>
                </LinearGradient>
                
                {/* Password field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password*</Text>
                  <TextInput
                    style={[styles.input, errors.password && styles.inputError]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Create a password"
                    secureTextEntry
                  />
                  {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>
                
                {/* Confirm Password field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Password*</Text>
                  <TextInput
                    style={[styles.input, errors.confirmPassword && styles.inputError]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    secureTextEntry
                  />
                  {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                </View>
                
                <LinearGradient
                  colors={['#e8f5e9', '#c8e6c9']}
                  style={styles.sectionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.sectionTitle}>Health Information</Text>
                </LinearGradient>
                
                {/* Age field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <TextInput
                    style={[styles.input, errors.age && styles.inputError]}
                    value={age}
                    onChangeText={setAge}
                    placeholder="Enter your age"
                    keyboardType="number-pad"
                  />
                  {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
                </View>
                
                {/* Gender field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  {renderGenderOptions()}
                </View>
                
                {/* Height and Weight fields */}
                <View style={styles.rowContainer}>
                  <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Height (cm)</Text>
                    <TextInput
                      style={[styles.input, errors.height && styles.inputError]}
                      value={height}
                      onChangeText={setHeight}
                      placeholder="Height"
                      keyboardType="decimal-pad"
                    />
                    {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
                  </View>
                  
                  <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.inputLabel}>Weight (kg)</Text>
                    <TextInput
                      style={[styles.input, errors.weight && styles.inputError]}
                      value={weight}
                      onChangeText={setWeight}
                      placeholder="Weight"
                      keyboardType="decimal-pad"
                    />
                    {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
                  </View>
                </View>
                
                <View style={styles.termsContainer}>
                  <Text style={styles.termsText}>
                    By registering, you agree to our Terms of Service and Privacy Policy.
                  </Text>
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
                    onPress={handleRegister}
                  >
                    <Text style={styles.buttonText}>Create Account</Text>
                  </TouchableOpacity>
                </LinearGradient>
                
                <TouchableOpacity 
                  style={styles.linkContainer}
                  onPress={() => navigateTo('login')}
                >
                  <Text style={styles.linkText}>
                    Already have an account? Login here
                  </Text>
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
    marginBottom: 20,
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: 15,
    backgroundColor: 'white',
    borderRadius: 35,
    padding: 10,
  },
  formTitle: {
    fontSize: 28,
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
    marginTop: 5,
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
    padding: 20,
    overflow: 'hidden',
  },
  sectionGradient: {
    marginTop: 15,
    marginBottom: 15,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F5F8FA',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#f44336',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 5,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  genderOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    marginRight: 8,
    marginBottom: 8,
  },
  genderOptionSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  genderOptionText: {
    color: '#555',
    fontSize: 14,
  },
  genderOptionTextSelected: {
    color: '#fff',
  },
  termsContainer: {
    marginVertical: 15,
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
    padding: 12,
    borderRadius: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#444',
    textAlign: 'center',
  },
  buttonGradient: {
    borderRadius: 8,
    marginVertical: 10,
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
  linkContainer: {
    paddingVertical: 15,
  },
  linkText: {
    color: '#2E7D32',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default RegisterScreen;