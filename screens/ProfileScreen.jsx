import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker"; // Az új könyvtár importálása
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Avatar, Divider, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { signOut } from "../api/authAPI";
import { getProfile } from "../api/profileApi";
import { ENUM_LABELS } from "../constans";
import { supabase } from "../lib/supabase";
import { isManagerLevel } from "../lib/permissions";

const ProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false); // Külön állapot a kép feltöltéséhez
  const [rawRole, setRawRole] = useState(null); // nyers szerepkör (gating)
  const [formData, setFormData] = useState({
    id: "",
    full_name: "",
    email: "",
    phone_number: "",
    license_number: "",
    role: "",
    avatar_url: null,
  });

  const MAIN_BG = "#0A2342"; // Sötétkék háttér

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const data = await getProfile(user.id);
      if (data) {
        // Megkeressük a címkét a konstans fájlban
        // Ha véletlenül nincs ilyen role, tartaléknak kiírjuk az eredeti adatot
        const displayRole = ENUM_LABELS.hu.user_role[data.role] || data.role;
        setRawRole(data.role);

        setFormData({
          id: data.id,
          full_name: data.full_name || "Névtelen Felhasználó",
          email: user.email || "",
          phone_number: data.phone_number || "+36 -- --- ----",
          license_number: data.license_number || "Nincs megadva",
          role: displayRole,
          avatar_url: data.avatar_url,
        });
      }
    } catch (error) {
      console.error("Profil hiba:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ÚJ FUNKCIÓK A KÉPKEZELÉSHEZ ---

  // 1. Engedélyek kérése és a képválasztó menü megjelenítése
  const showImageOptions = () => {
    Alert.alert("Profilkép módosítása", "Válassz egy lehetőséget:", [
      { text: "Kamera megnyitása", onPress: takePhoto },
      { text: "Választás galériából", onPress: pickImage },
      { text: "Mégse", style: "cancel" },
    ]);
  };

  // 2. Kép készítése kamerával
  const takePhoto = async () => {
    try {
      const cameraPermission =
        await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== "granted") {
        Alert.alert("Hiba", "Nem adtál engedélyt a kamera használatára.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, // Engedélyezi a vágást
        aspect: [1, 1], // Négyzet alakú vágás
        quality: 0.5, // Tömörítés a gyorsabb feltöltésért
      });

      if (!result.canceled) {
        uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Kamera hiba:", error);
    }
  };

  // 3. Kép választása galériából
  const pickImage = async () => {
    try {
      const libraryPermission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libraryPermission.status !== "granted") {
        Alert.alert("Hiba", "Nem adtál engedélyt a galéria elérésére.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Galéria hiba:", error);
    }
  };

  // 4. A kép feltöltése Supabase Storage-ba és az adatbázis frissítése
  const uploadAvatar = async (pickedUri) => {
    try {
      setUploading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fájlnév generálása (user_id + időbélyeg a duplikáció ellen)
      const fileExt = pickedUri.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Kép átalakítása Blob formátumba (szükséges a Supabase feltöltéshez)
      const response = await fetch(pickedUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      // KÉP FELTÖLTÉSE A STORAGE-BA (avatars bucket)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, arrayBuffer, {
          contentType: blob.type,
          upsert: true, // Ha létezik, felülírja
        });

      if (uploadError) throw uploadError;

      // A FELTÖLTÖTT KÉP PUBLIKUS LINKJÉNEK LEKÉRÉSE
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // AZ ADATBÁZIS (profiles tábla) FRISSÍTÉSE AZ ÚJ LINKKEL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Állapot frissítése az appban, hogy azonnal látszódjon a változás
      setFormData({ ...formData, avatar_url: publicUrl });
      Alert.alert("Siker", "Profilkép sikeresen frissítve!");
    } catch (error) {
      console.error("Feltöltési hiba:", error.message);
      Alert.alert("Hiba", "Nem sikerült feltölteni a képet.");
    } finally {
      setUploading(false);
    }
  };

  // --- Segédkomponens az adatokhoz ---
  const DetailRow = ({ label, value }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: MAIN_BG }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Profile</Text>

        {/* FELSŐ KÁRTYA - Most már kattintható az avatar területe */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={showImageOptions} disabled={uploading}>
            <View style={styles.avatarContainer}>
              {uploading ? (
                // Töltés jelző, amíg a kép feltöltődik
                <View style={[styles.placeholderAvatar, styles.loadingAvatar]}>
                  <ActivityIndicator size="large" color="#0A2342" />
                </View>
              ) : formData.avatar_url ? (
                <Avatar.Image
                  size={120}
                  source={{ uri: formData.avatar_url }}
                />
              ) : (
                <View style={styles.placeholderAvatar}>
                  <FontAwesome5 name="user" size={60} color="#0A2342" />
                </View>
              )}
              {/* Kamera ikon a kép sarkában jelzi, hogy szerkeszthető */}
              {!uploading && (
                <View style={styles.editIconBadge}>
                  <MaterialCommunityIcons
                    name="camera"
                    size={18}
                    color="white"
                  />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{formData.full_name}</Text>
          <Text style={styles.userRole}>{formData.role}</Text>
        </View>

        {/* CÉGVEZÉRLÉS BELÉPÉSI PONT – csak admin/manager/owner */}
        {isManagerLevel(rawRole) && (
          <TouchableOpacity
            style={styles.adminButton}
            activeOpacity={0.85}
            onPress={() => navigation?.navigate("AdminDashboard")}
          >
            <View style={styles.adminIconBox}>
              <MaterialCommunityIcons name="shield-account" size={24} color="#0A2342" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminButtonTitle}>Cégvezérlés / Adminisztráció</Text>
              <Text style={styles.adminButtonSub}>Járművek, raktár, sofőrök és vezetőség</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={26} color="#0A2342" />
          </TouchableOpacity>
        )}

        {/* ALSÓ KÁRTYA - SZEMÉLYES ADATOK */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Personal Details</Text>

          <DetailRow label="Email:" value={formData.email} />
          <Divider style={styles.divider} />

          <DetailRow label="Phone:" value={formData.phone_number} />
          <Divider style={styles.divider} />

          <DetailRow label="License:" value={formData.license_number} />
        </View>

        {/* KIJELENTKEZÉS GOMB */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => signOut()}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 25, paddingBottom: 40 },
  headerTitle: {
    color: "white",
    fontSize: 20,
    textAlign: "center",
    marginVertical: 20,
    fontWeight: "500",
  },

  profileCard: {
    backgroundColor: "white",
    borderRadius: 30,
    paddingVertical: 40,
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 15,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    position: "relative", // Szükséges a kamera ikon pozicionálásához
  },
  placeholderAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0f4f8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#0A2342",
  },
  loadingAvatar: { borderColor: "rgba(10, 35, 66, 0.2)" }, // Halványabb keret töltéskor
  userName: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#0A2342",
    textAlign: "center",
  },
  userRole: { fontSize: 18, color: "#333", marginTop: 5 },

  editIconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1e3a5f",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
  },

  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  adminIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  adminButtonTitle: { fontSize: 16, fontWeight: "800", color: "#0A2342", letterSpacing: 0.2 },
  adminButtonSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  detailsCard: {
    backgroundColor: "white",
    borderRadius: 30,
    padding: 25,
    marginBottom: 30,
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0A2342",
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    width: "30%",
  },
  detailValue: {
    fontSize: 16,
    color: "#333",
    width: "70%",
    textAlign: "right",
  },
  divider: { backgroundColor: "#e2e8f0", height: 1 },

  logoutButton: {
    backgroundColor: "white",
    borderRadius: 20,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: { fontSize: 24, fontWeight: "bold", color: "#0A2342" },
});

export default ProfileScreen;
