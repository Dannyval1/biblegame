// app/profile/index.tsx
import {
    CREEDS,
    DENOMINATIONS,
    GameStats,
    UserProfile,
} from "@/types/Settings";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

const DEFAULT_PROFILE: UserProfile = {
  username: `User${Math.floor(Math.random() * 9999)}`,
  email: '',
  avatar: 0,
  creed: '',
  denomination: '',
  gamesPlayed: 0,
  averageScore: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  createdAt: new Date().toISOString(),
};

const AVATAR_IMAGES = [
  '👤', '👨', '👩', '🧔', '👱‍♂️', '👱‍♀️', '👨‍🦱', '👩‍🦱'
];

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [showEmailEdit, setShowEmailEdit] = useState(false);
  const [showReligiousInfo, setShowReligiousInfo] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [tempCreed, setTempCreed] = useState('');
  const [tempDenomination, setTempDenomination] = useState('');

  useEffect(() => {
    loadProfile();
    loadGameStats();
  }, []);

  const loadProfile = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('userProfile');
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGameStats = async () => {
    try {
      const savedStats = await AsyncStorage.getItem('gameStats');
      if (savedStats) {
        const stats: GameStats = JSON.parse(savedStats);
        setProfile(prev => ({
          ...prev,
          gamesPlayed: stats.gamesPlayed,
          totalQuestions: stats.totalQuestions,
          correctAnswers: stats.correctAnswers,
          averageScore: stats.totalQuestions > 0 ? 
            Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0,
          currentStreak: stats.currentStreak,
          bestStreak: stats.bestStreak,
        }));
      }
    } catch (error) {
      console.error('Error loading game stats:', error);
    }
  };

  const saveProfile = async (updatedProfile: UserProfile) => {
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      setProfile(updatedProfile);
      Alert.alert('Success', 'Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  const handleUsernameEdit = () => {
    setTempUsername(profile.username);
    setShowUsernameEdit(true);
  };

  const handleSaveUsername = () => {
    if (tempUsername.trim()) {
      const updatedProfile = { ...profile, username: tempUsername.trim() };
      saveProfile(updatedProfile);
      setShowUsernameEdit(false);
    }
  };

  const handleEmailEdit = () => {
    setTempEmail(profile.email);
    setShowEmailEdit(true);
  };

  const handleSaveEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!tempEmail || emailRegex.test(tempEmail)) {
      const updatedProfile = { ...profile, email: tempEmail };
      saveProfile(updatedProfile);
      setShowEmailEdit(false);
    } else {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
    }
  };

  const handleReligiousInfoEdit = () => {
    setTempCreed(profile.creed);
    setTempDenomination(profile.denomination);
    setShowReligiousInfo(true);
  };

  const handleSaveReligiousInfo = () => {
    const updatedProfile = {
      ...profile,
      creed: tempCreed,
      denomination: tempDenomination,
    };
    saveProfile(updatedProfile);
    setShowReligiousInfo(false);
  };

  const handleAvatarChange = (index: number) => {
    const updatedProfile = { ...profile, avatar: index };
    saveProfile(updatedProfile);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Avatar and Username Section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarGrid}>
          {AVATAR_IMAGES.map((emoji, index) => (
            <Pressable
              key={index}
              style={[
                styles.avatarOption,
                profile.avatar === index && styles.selectedAvatar
              ]}
              onPress={() => handleAvatarChange(index)}
            >
              <Text style={styles.avatarEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.username}>{profile.username}</Text>
        <Pressable style={styles.editButton} onPress={handleUsernameEdit}>
          <Text style={styles.editButtonText}>✏️ Edit Name</Text>
        </Pressable>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📧 Account</Text>
        <Text style={styles.emailText}>
          {profile.email || 'No email linked'}
        </Text>
        <Pressable style={styles.linkButton} onPress={handleEmailEdit}>
          <Text style={styles.linkButtonText}>
            {profile.email ? '🔄 Change Email' : '🔗 Link Account'}
          </Text>
        </Pressable>
      </View>

      {/* Religious Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⛪ Religious Information</Text>
          <Pressable style={styles.editIconButton} onPress={handleReligiousInfoEdit}>
            <Text style={styles.editIcon}>✏️</Text>
          </Pressable>
        </View>
        <Text style={styles.infoText}>
          Creed: {profile.creed || 'Not specified'}
        </Text>
        <Text style={styles.infoText}>
          Denomination: {profile.denomination || 'Not specified'}
        </Text>
      </View>

      {/* Progress Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 My Progress</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.gamesPlayed}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.averageScore}%</Text>
            <Text style={styles.statLabel}>Average</Text>
          </View>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.bestStreak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
        </View>
        <Pressable style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>📈 View Detailed Stats</Text>
        </Pressable>
      </View>

      {/* Achievements Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 Recent Achievements</Text>
        <View style={styles.achievementsGrid}>
          <View style={styles.achievement}>
            <Text style={styles.achievementIcon}>🥇</Text>
            <Text style={styles.achievementText}>First Game</Text>
          </View>
          <View style={styles.achievement}>
            <Text style={styles.achievementIcon}>🥈</Text>
            <Text style={styles.achievementText}>10 Games</Text>
          </View>
          <View style={styles.achievement}>
            <Text style={styles.achievementIcon}>🥉</Text>
            <Text style={styles.achievementText}>Good Streak</Text>
          </View>
        </View>
        <Pressable style={styles.linkButton}>
          <Text style={styles.linkButtonText}>View All Achievements</Text>
        </Pressable>
      </View>

      {/* Username Edit Modal */}
      <Modal visible={showUsernameEdit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Username</Text>
            <TextInput
              style={styles.textInput}
              value={tempUsername}
              onChangeText={setTempUsername}
              placeholder="Enter username"
              maxLength={20}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowUsernameEdit(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveUsername}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Email Edit Modal */}
      <Modal visible={showEmailEdit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {profile.email ? 'Change Email' : 'Link Account'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={tempEmail}
              onChangeText={setTempEmail}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEmailEdit(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveEmail}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Religious Info Modal */}
      <Modal visible={showReligiousInfo} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.religiousModal}>
            <Text style={styles.modalTitle}>Religious Information</Text>
            
            <ScrollView 
              style={styles.religiousContent}
              showsVerticalScrollIndicator={true}
              bounces={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text style={styles.label}>Creed:</Text>
              <View style={styles.pickerContainer}>
                {CREEDS.map((creed) => (
                  <Pressable
                    key={creed}
                    style={[
                      styles.pickerOption,
                      tempCreed === creed && styles.selectedOption
                    ]}
                    onPress={() => setTempCreed(creed === 'Select...' ? '' : creed)}
                  >
                    <Text style={[
                      styles.pickerText,
                      tempCreed === creed && styles.selectedText
                    ]}>
                      {creed}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Denomination:</Text>
              <View style={styles.pickerContainer}>
                {DENOMINATIONS.map((denomination) => (
                  <Pressable
                    key={denomination}
                    style={[
                      styles.pickerOption,
                      tempDenomination === denomination && styles.selectedOption
                    ]}
                    onPress={() => setTempDenomination(denomination === 'Select...' ? '' : denomination)}
                  >
                    <Text style={[
                      styles.pickerText,
                      tempDenomination === denomination && styles.selectedText
                    ]}>
                      {denomination}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowReligiousInfo(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveReligiousInfo}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  avatarSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  avatarOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAvatar: {
    borderColor: '#2D4B8E',
    backgroundColor: '#e6f2ff',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  editButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#2D4B8E',
    fontSize: 16,
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D4B8E',
    marginBottom: 15,
  },
  editIconButton: {
    padding: 5,
  },
  editIcon: {
    fontSize: 18,
  },
  emailText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
  },
  linkButton: {
    backgroundColor: '#2D4B8E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D4B8E',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  detailsButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#2D4B8E',
    fontSize: 16,
  },
  achievementsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  achievement: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    width: '30%',
  },
  achievementIcon: {
    fontSize: 30,
    marginBottom: 5,
  },
  achievementText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 15,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  selectedOption: {
    backgroundColor: '#2D4B8E',
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  selectedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#2D4B8E',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  religiousModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    height: '75%',
    padding: 25,
    flexDirection: 'column',
  },
  religiousContent: {
    flex: 1,
    marginBottom: 10,
    marginTop: 10,
  },
});
