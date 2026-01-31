import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Avatar,
  Badge,
  Button,
  Divider,
  List,
  Surface,
  Switch,
  Text,
  TextInput,
  useTheme
} from 'react-native-paper';
// Fontos: Használjunk MaterialCommunityIcons-t a szép ikonokért
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { signOut } from '../api/authAPI';
import { getProfile } from '../api/profileAPI';
import { supabase } from '../lib/supabase';

const ProfileScreen = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Állapotok a kapcsolókhoz (demo)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    full_name: '',
    email: '',
    phone_number: '',
    license_number: '',
    avatar_url: null
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await getProfile();
      if (data) {
        setFormData({
            id: data.id,
            full_name: data.full_name || '',
            email: data.email || '',
            phone_number: data.phone_number || '',
            license_number: data.license_number || 'HU-12345678',
            avatar_url: data.avatar_url
        });
      }
    } catch (error) {
      console.log('Hiba:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: formData.full_name,
                phone_number: formData.phone_number,
            })
            .eq('id', formData.id);

        if (error) throw error;
        
        setIsEditing(false);
        Alert.alert("Siker", "Profil frissítve!");
    } catch (error) {
        Alert.alert("Hiba", "Mentés sikertelen: " + error.message);
    } finally {
        setSaving(false);
    }
  };

  const handleCancel = () => {
      fetchProfile();
      setIsEditing(false);
  };

  const handleImagePress = () => {
      if (!isEditing) return;
      Alert.alert(
          "Profilkép módosítása",
          "Válassz forrást:",
          [
              { text: "Mégse", style: "cancel" },
              { text: "Fotózás (Kamera)", onPress: () => pickImage('camera') },
              { text: "Galéria", onPress: () => pickImage('gallery') },
          ]
      );
  };

  const pickImage = async (mode) => {
      let result;
      const options = {
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
      };

      if (mode === 'camera') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
              Alert.alert("Hiba", "Nincs engedély a kamera használatára.");
              return;
          }
          result = await ImagePicker.launchCameraAsync(options);
      } else {
          result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
          uploadAvatarToSupabase(result.assets[0]);
      }
  };

  const uploadAvatarToSupabase = async (imageAsset) => {
      try {
          const filePath = `${formData.id}/avatar.png`;
          const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, decode(imageAsset.base64), { contentType: 'image/png', upsert: true });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
          setFormData(prev => ({ ...prev, avatar_url: publicUrl })); 
          await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', formData.id);

      } catch (error) {
          Alert.alert("Hiba", "Képfeltöltés sikertelen: " + error.message);
      }
  };

  const getInitials = (name) => {
    if(!name) return '??';
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) initials += names[names.length - 1].substring(0, 1).toUpperCase();
    return initials;
  };

  // --- ÚJ: Segédfüggvény a lekerekített csoportokhoz ---
  const RoundedGroup = ({ children, title }) => (
    <View style={styles.groupContainer}>
        {title && <Text variant="titleMedium" style={[styles.groupTitle, { color: theme.colors.onSurfaceVariant }]}>{title}</Text>}
        <Surface style={[styles.roundedSurface, { backgroundColor: theme.colors.elevation.level2 }]} elevation={1}>
            {children}
        </Surface>
    </View>
  );

  // --- ÚJ: Egyedi List Item a jobb oldali elemek kezeléséhez ---
  const CustomListItem = ({ title, icon, rightType, rightValue, onPress, titleStyle }) => {
    let rightElement;
    switch (rightType) {
        case 'badge':
            rightElement = <Badge style={{alignSelf:'center', backgroundColor: theme.colors.primary}}>{rightValue}</Badge>;
            break;
        case 'switch':
            rightElement = <Switch value={rightValue.value} onValueChange={rightValue.onValueChange} />;
            break;
        case 'chevron':
        default:
            rightElement = <List.Icon icon="chevron-right" color={theme.colors.onSurfaceVariant} style={{margin:0}} />;
            break;
    }

    return (
        <List.Item
            title={title}
            titleStyle={titleStyle}
            left={props => <MaterialCommunityIcons name={icon} size={24} color={titleStyle?.color || theme.colors.primary} style={{marginRight: 10, alignSelf:'center'}} />}
            right={props => <View style={{justifyContent:'center'}}>{rightElement}</View>}
            onPress={onPress}
            style={styles.listItem}
            rippleColor={theme.colors.primaryContainer}
        />
    );
  }


  // --- FŐ RENDER ---
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* 1. FEJLÉC (Header) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleImagePress} disabled={!isEditing || loading}>
            <View>
                {formData.avatar_url ? (
                    <Avatar.Image 
                        size={100} 
                        source={{ uri: formData.avatar_url + `?t=${new Date().getTime()}` }} 
                    />
                ) : (
                    <Avatar.Text 
                        size={100} 
                        label={getInitials(formData.full_name)} 
                        style={{ backgroundColor: theme.colors.primary }}
                    />
                )}
                {isEditing && (
                    <View style={[styles.editBadge, { backgroundColor: theme.colors.primary }]}>
                        <MaterialCommunityIcons name="camera" size={20} color="white" />
                    </View>
                )}
            </View>
        </TouchableOpacity>

        {isEditing ? (
             <TextInput 
                value={formData.full_name}
                onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                style={styles.nameInput} mode="outlined" label="Teljes név" dense
            />
        ) : (
            <Text variant="headlineSmall" style={[styles.name, { color: theme.colors.onBackground }]}>
            {formData.full_name || 'Betöltés...'}
            </Text>
        )}
        
        <Text variant="bodyMedium" style={{ color: theme.colors.secondary, marginBottom: 15 }}>
          {formData.email}
        </Text>

        {!isEditing && (
            <Button 
                mode="contained-tonal" 
                onPress={() => setIsEditing(true)} 
                style={styles.editButton}
                labelStyle={{ fontWeight: 'bold' }}
            >
                Profil szerkesztése
            </Button>
        )}
      </View>

      {/* 2. SZERKESZTŐ NÉZET (Ha isEditing = true) */}
      {isEditing && (
        <RoundedGroup title="Adatok módosítása">
             <View style={{padding: 15}}>
                 <TextInput
                    label="Telefon" icon="phone" value={formData.phone_number}
                    onChangeText={t => setFormData({...formData, phone_number: t})}
                    mode="outlined" style={styles.editInput}
                    left={<TextInput.Icon icon="phone" />}
                 />
                 <TextInput
                    label="Jogosítvány" value={formData.license_number}
                    mode="outlined" style={styles.editInput} disabled
                    left={<TextInput.Icon icon="card-account-details" />}
                 />
                 <View style={styles.buttonRow}>
                    <Button mode="outlined" onPress={handleCancel} style={{ flex: 1, marginRight: 10 }}>Mégse</Button>
                    <Button mode="contained" onPress={handleSave} loading={saving} style={{ flex: 1 }}>Mentés</Button>
                </View>
            </View>
        </RoundedGroup>
      )}


      {/* 3. LISTA NÉZET (Ha NEM szerkesztünk) */}
      {!isEditing && (
        <>
            {/* Statisztikák Csoport */}
            <RoundedGroup title="Statisztikák">
                <CustomListItem 
                    title="Aktív fuvarok" 
                    icon="steering" 
                    rightType="badge" rightValue="2" 
                    onPress={() => console.log('Navigálás fuvarokhoz')}
                />
                <Divider style={styles.divider} />
                <CustomListItem 
                    title="Előzmények" 
                    icon="history" 
                    rightType="chevron"
                    onPress={() => console.log('Navigálás előzményekhez')}
                />
            </RoundedGroup>

            {/* Beállítások Csoport */}
            <RoundedGroup title="Preferenciák">
                <CustomListItem 
                    title="Értesítések" 
                    icon="bell-outline" 
                    rightType="switch" 
                    rightValue={{ value: notificationsEnabled, onValueChange: setNotificationsEnabled }}
                />
                <Divider style={styles.divider} />
                <CustomListItem 
                    title="Biometrikus azonosítás" 
                    icon="face-recognition" 
                    rightType="switch" 
                    rightValue={{ value: biometricsEnabled, onValueChange: setBiometricsEnabled }}
                />
                <Divider style={styles.divider} />
                 <CustomListItem 
                    title="Jelszó módosítása" 
                    icon="lock-reset" 
                    rightType="chevron"
                    onPress={() => console.log('Jelszó módosítás')}
                />
            </RoundedGroup>

            {/* Kijelentkezés Csoport */}
            <RoundedGroup>
                <CustomListItem 
                    title="Kijelentkezés" 
                    icon="logout-variant" 
                    titleStyle={{ color: theme.colors.error, fontWeight: 'bold' }}
                    rightType="none"
                    onPress={async () => { await signOut(); }}
                />
            </RoundedGroup>
        </>
      )}
      
      <View style={{height: 40}} />{/* Alsó margó */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { alignItems: 'center', marginVertical: 30 },
  name: { marginTop: 10, fontWeight: 'bold' },
  nameInput: { marginTop: 15, width: '80%', textAlign: 'center' },
  editButton: { borderRadius: 20, paddingHorizontal: 10 },
  
  // Új stílusok a csoportosított listához
  groupContainer: { marginBottom: 20 },
  groupTitle: { marginLeft: 10, marginBottom: 8, fontWeight: '600' },
  roundedSurface: { borderRadius: 16, overflow: 'hidden' }, // Ez adja a kerekítést!
  listItem: { paddingVertical: 12 },
  divider: { backgroundColor: 'rgba(255,255,255,0.1)' }, // Halvány elválasztó sötét módban

  // Szerkesztő stílusok
  editInput: { marginBottom: 15, backgroundColor: 'transparent' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  editBadge: {
      position: 'absolute', bottom: 0, right: 0, borderRadius: 20,
      width: 36, height: 36, justifyContent: 'center', alignItems: 'center', elevation: 4
  }
});

export default ProfileScreen;