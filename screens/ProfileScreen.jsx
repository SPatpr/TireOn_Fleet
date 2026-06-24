import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { signOut } from "../api/authAPI";
import { getProfile } from "../api/profileApi";
import { ENUM_LABELS } from "../constans";
import { isManagerLevel, isOwner } from "../lib/permissions";
import { supabase } from "../lib/supabase";

const DARK = "#050c18";
const NAVY = "#0A2342";
const SETTINGS_KEY = "tireon:settings";
const DEFAULT_SETTINGS = {
  notifications: true,
  language: "hu",
  theme: "dark",
  pressureUnit: "bar",
  depthUnit: "mm",
};

// Monogram a teljes névből
const getInitials = (name) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

// ── Kis kétállású szegmens-kapcsoló ──
const Segmented = ({ options, value, onChange }) => (
  <View style={styles.segmented}>
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <TouchableOpacity
          key={opt.value}
          style={[styles.segment, active && styles.segmentActive]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ── Egy beállítás-sor (fehér kártya belső sora) ──
const SettingRow = ({ icon, label, sub, right, onPress, divider }) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.row, divider && styles.rowDivider]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={NAVY} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right}
    </Wrapper>
  );
};

const ProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [rawRole, setRawRole] = useState(null);
  const [company, setCompany] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Modálok + szerkesztés
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    full_name: "",
    email: "",
    phone_number: "",
    license_number: "",
    role: "",
    avatar_url: null,
  });

  useEffect(() => {
    fetchProfile();
    AsyncStorage.getItem(SETTINGS_KEY)
      .then((raw) => { if (raw) setSettings((s) => ({ ...s, ...JSON.parse(raw) })); })
      .catch(() => {});
  }, []);

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const data = await getProfile(user.id);
      if (data) {
        setRawRole(data.role);
        setFormData({
          id: data.id,
          full_name: data.full_name || "Névtelen Felhasználó",
          email: user.email || "",
          phone_number: data.phone_number || "Nincs megadva",
          license_number: data.license_number || "Nincs megadva",
          role: ENUM_LABELS.hu.user_role[data.role] || data.role,
          avatar_url: data.avatar_url,
        });

        // Cégnév (best-effort)
        if (data.company_id) {
          const { data: comp } = await supabase
            .from("companies")
            .select("official_name")
            .eq("id", data.company_id)
            .maybeSingle();
          if (comp?.official_name) setCompany(comp.official_name);
        }
      }
    } catch (error) {
      console.error("Profil hiba:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- AVATAR KEZELÉS (megtartva) ---
  const showImageOptions = () => {
    Alert.alert("Profilkép módosítása", "Válassz egy lehetőséget:", [
      { text: "Kamera megnyitása", onPress: takePhoto },
      { text: "Választás galériából", onPress: pickImage },
      { text: "Mégse", style: "cancel" },
    ]);
  };

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Hiba", "Nem adtál engedélyt a kamera használatára.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.5,
      });
      if (!result.canceled) uploadAvatar(result.assets[0].uri);
    } catch (error) {
      console.error("Kamera hiba:", error);
    }
  };

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Hiba", "Nem adtál engedélyt a galéria elérésére.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.5,
      });
      if (!result.canceled) uploadAvatar(result.assets[0].uri);
    } catch (error) {
      console.error("Galéria hiba:", error);
    }
  };

  const uploadAvatar = async (pickedUri) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = pickedUri.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const response = await fetch(pickedUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, arrayBuffer, { contentType: blob.type, upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (updateError) throw updateError;

      setFormData((f) => ({ ...f, avatar_url: publicUrl }));
      Alert.alert("Siker", "Profilkép sikeresen frissítve!");
    } catch (error) {
      console.error("Feltöltési hiba:", error.message);
      Alert.alert("Hiba", "Nem sikerült feltölteni a képet.");
    } finally {
      setUploading(false);
    }
  };

  // Telefonszám szerkesztése
  const openPhoneEdit = () => {
    setNewPhone(formData.phone_number === "Nincs megadva" ? "" : formData.phone_number);
    setPhoneOpen(true);
  };

  const savePhone = async () => {
    setSavingPhone(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("profiles")
        .update({ phone_number: newPhone.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
      setFormData((f) => ({ ...f, phone_number: newPhone.trim() || "Nincs megadva" }));
      setPhoneOpen(false);
    } catch (error) {
      Alert.alert("Hiba", error.message || "Nem sikerült menteni a telefonszámot.");
    } finally {
      setSavingPhone(false);
    }
  };

  // Jelszó módosítása
  const savePassword = async () => {
    if (newPw.length < 6) {
      Alert.alert("Túl rövid", "A jelszónak legalább 6 karakter hosszúnak kell lennie.");
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert("Nem egyezik", "A két jelszó nem egyezik.");
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setPwOpen(false);
      setNewPw("");
      setConfirmPw("");
      Alert.alert("Siker", "A jelszó sikeresen módosítva.");
    } catch (error) {
      Alert.alert("Hiba", error.message || "Nem sikerült módosítani a jelszót.");
    } finally {
      setSavingPw(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Kijelentkezés", "Biztosan kijelentkezel?", [
      { text: "Mégse", style: "cancel" },
      { text: "Kijelentkezés", style: "destructive", onPress: () => signOut().catch(() => {}) },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }

  const roleLine = [formData.role, company].filter(Boolean).join(" • ");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Profil</Text>

        {/* ── FELHASZNÁLÓI KÁRTYA ── */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={showImageOptions} disabled={uploading} activeOpacity={0.85}>
            <View style={styles.avatarWrap}>
              {uploading ? (
                <View style={[styles.avatarCircle, styles.avatarMono]}>
                  <ActivityIndicator color={NAVY} />
                </View>
              ) : formData.avatar_url ? (
                <Image source={{ uri: formData.avatar_url }} style={styles.avatarCircle} />
              ) : (
                <View style={[styles.avatarCircle, styles.avatarMono]}>
                  <Text style={styles.monoText}>{getInitials(formData.full_name)}</Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <MaterialCommunityIcons name="camera" size={15} color="white" />
              </View>
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{formData.full_name}</Text>
          {roleLine ? <Text style={styles.userRole}>{roleLine}</Text> : null}

          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Aktív</Text>
          </View>
        </View>

        {/* ── ELÉRHETŐSÉG ── */}
        <Text style={styles.sectionLabel}>Elérhetőség</Text>
        <View style={styles.card}>
          <SettingRow icon="email-outline" label={formData.email || "Nincs e-mail"} sub="E-mail cím" divider />
          <SettingRow
            icon="phone-outline"
            label={formData.phone_number}
            sub="Telefonszám"
            onPress={openPhoneEdit}
            right={<MaterialCommunityIcons name="pencil" size={18} color="#94a3b8" />}
            divider
          />
          <SettingRow
            icon="lock-outline"
            label="Jelszó módosítása"
            sub="Új jelszó beállítása"
            onPress={() => { setNewPw(""); setConfirmPw(""); setPwOpen(true); }}
            right={<MaterialCommunityIcons name="chevron-right" size={22} color="#94a3b8" />}
          />
        </View>

        {/* ── BEÁLLÍTÁSOK (egy gomb → modal) ── */}
        <Text style={styles.sectionLabel}>Beállítások</Text>
        <View style={styles.card}>
          <SettingRow
            icon="cog-outline"
            label="Alkalmazás beállításai"
            sub="Értesítések, nyelv, téma, mértékegységek"
            onPress={() => setSettingsOpen(true)}
            right={<MaterialCommunityIcons name="chevron-right" size={22} color="#94a3b8" />}
          />
        </View>

        {/* ── ADMINISZTRÁCIÓ (rang-specifikus) ── */}
        {(isManagerLevel(rawRole) || isOwner(rawRole)) && (
          <>
            <Text style={styles.sectionLabel}>Adminisztráció</Text>
            <View style={styles.card}>
              {isManagerLevel(rawRole) && (
                <SettingRow
                  icon="shield-account"
                  label="Cégvezérlés / Adminisztráció"
                  sub="Járművek, raktár, sofőrök, vezetőség"
                  divider={isOwner(rawRole)}
                  onPress={() => navigation?.navigate("AdminDashboard")}
                  right={<MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />}
                />
              )}
              {isOwner(rawRole) && (
                <SettingRow
                  icon="crown-outline"
                  label="Tulajdonosi beállítások"
                  sub="Jogosultság-mátrix"
                  onPress={() => navigation?.navigate("OwnerSettings")}
                  right={<MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />}
                />
              )}
            </View>
          </>
        )}

        {/* ── KIJELENTKEZÉS ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Kijelentkezés</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── BEÁLLÍTÁSOK MODAL (alsó lap) ── */}
      <Modal visible={settingsOpen} transparent animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Beállítások</Text>
              <TouchableOpacity onPress={() => setSettingsOpen(false)} style={styles.sheetClose} hitSlop={12}>
                <Text style={styles.sheetCloseX}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <SettingRow
                icon="bell-ring-outline"
                label="Értesítések"
                sub="Kritikus nyomásriasztások (Push)"
                divider
                right={
                  <Switch
                    value={settings.notifications}
                    onValueChange={(v) => updateSetting("notifications", v)}
                    trackColor={{ false: "#cbd5e1", true: NAVY }}
                    thumbColor="#ffffff"
                    ios_backgroundColor="#cbd5e1"
                  />
                }
              />
              <SettingRow
                icon="translate"
                label="Nyelv"
                divider
                right={
                  <Segmented
                    value={settings.language}
                    onChange={(v) => updateSetting("language", v)}
                    options={[{ value: "hu", label: "HU" }, { value: "en", label: "EN" }]}
                  />
                }
              />
              <SettingRow
                icon="palette-outline"
                label="Téma"
                divider
                right={
                  <Segmented
                    value={settings.theme}
                    onChange={(v) => updateSetting("theme", v)}
                    options={[{ value: "dark", label: "Sötét" }, { value: "light", label: "Világos" }]}
                  />
                }
              />
              <SettingRow
                icon="gauge"
                label="Nyomás egysége"
                divider
                right={
                  <Segmented
                    value={settings.pressureUnit}
                    onChange={(v) => updateSetting("pressureUnit", v)}
                    options={[{ value: "bar", label: "bar" }, { value: "psi", label: "psi" }]}
                  />
                }
              />
              <SettingRow
                icon="ruler"
                label="Profilmélység egysége"
                right={
                  <Segmented
                    value={settings.depthUnit}
                    onChange={(v) => updateSetting("depthUnit", v)}
                    options={[{ value: "mm", label: "mm" }, { value: "inch", label: "inch" }]}
                  />
                }
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── TELEFONSZÁM SZERKESZTÉSE ── */}
      <Modal visible={phoneOpen} transparent animationType="fade" onRequestClose={() => setPhoneOpen(false)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Telefonszám szerkesztése</Text>
            <TextInput
              style={styles.dialogInput}
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="+36 30 123 4567"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              autoFocus
            />
            <View style={styles.dialogBtnRow}>
              <TouchableOpacity style={styles.dialogCancel} onPress={() => setPhoneOpen(false)}>
                <Text style={styles.dialogCancelText}>Mégse</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogSave} onPress={savePhone} disabled={savingPhone}>
                {savingPhone ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.dialogSaveText}>Mentés</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── JELSZÓ MÓDOSÍTÁSA ── */}
      <Modal visible={pwOpen} transparent animationType="fade" onRequestClose={() => setPwOpen(false)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Jelszó módosítása</Text>
            <TextInput
              style={styles.dialogInput}
              value={newPw}
              onChangeText={setNewPw}
              placeholder="Új jelszó (min. 6 karakter)"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              autoFocus
            />
            <TextInput
              style={[styles.dialogInput, { marginTop: 10 }]}
              value={confirmPw}
              onChangeText={setConfirmPw}
              placeholder="Új jelszó megerősítése"
              placeholderTextColor="#94a3b8"
              secureTextEntry
            />
            <View style={styles.dialogBtnRow}>
              <TouchableOpacity style={styles.dialogCancel} onPress={() => setPwOpen(false)}>
                <Text style={styles.dialogCancelText}>Mégse</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogSave} onPress={savePassword} disabled={savingPw}>
                {savingPw ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.dialogSaveText}>Mentés</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },
  screenTitle: {
    color: "white",
    fontSize: 26,
    fontWeight: "700",
    marginVertical: 14,
    marginLeft: 4,
  },

  // Felhasználói kártya
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingVertical: 28,
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  avatarWrap: { position: "relative", marginBottom: 14 },
  avatarCircle: { width: 104, height: 104, borderRadius: 52 },
  avatarMono: {
    backgroundColor: "#0f1c33",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#1e3a5f",
  },
  monoText: { color: "#39e6ff", fontSize: 38, fontWeight: "800", letterSpacing: 1 },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1e3a5f",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  userName: { fontSize: 24, fontWeight: "800", color: "#0f172a", letterSpacing: 0.3 },
  userRole: { fontSize: 14, color: "#64748b", marginTop: 4, fontWeight: "500" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "rgba(54,226,198,0.12)",
    borderWidth: 1,
    borderColor: "#36e2c6",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16a34a",
    shadowColor: "#16a34a",
    shadowOpacity: 0.9,
    shadowRadius: 3,
    elevation: 3,
  },
  statusText: { color: "#0f766e", fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },

  // Szekciók
  sectionLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 6,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: "#eef2f7" },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  rowSub: { fontSize: 12, color: "#64748b", marginTop: 2 },

  // Szegmens-kapcsoló
  segmented: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 3,
  },
  segment: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  segmentActive: { backgroundColor: NAVY },
  segmentText: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  segmentTextActive: { color: "#ffffff" },

  // Kijelentkezés
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#ef4444",
    backgroundColor: "rgba(239,68,68,0.06)",
    marginTop: 22,
  },
  logoutText: { color: "#ef4444", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },

  // Beállítások alsó lap
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,8,20,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#eef2f7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, paddingHorizontal: 4 },
  sheetTitle: { flex: 1, fontSize: 20, fontWeight: "800", color: "#0A2342" },
  sheetClose: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center",
  },
  sheetCloseX: { fontSize: 15, color: "#64748b", fontWeight: "700" },

  // Telefon / jelszó dialógus
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,8,20,0.7)",
    justifyContent: "center",
    padding: 28,
  },
  dialogCard: { backgroundColor: "#ffffff", borderRadius: 22, padding: 22 },
  dialogTitle: { fontSize: 18, fontWeight: "800", color: "#0A2342", marginBottom: 16 },
  dialogInput: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0A2342",
    backgroundColor: "#f8fafc",
  },
  dialogBtnRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  dialogCancel: {
    flex: 1, height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#e2e8f0",
    alignItems: "center", justifyContent: "center",
  },
  dialogCancelText: { color: "#64748b", fontSize: 15, fontWeight: "700" },
  dialogSave: {
    flex: 1.4, height: 48, borderRadius: 12,
    backgroundColor: NAVY, alignItems: "center", justifyContent: "center",
  },
  dialogSaveText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
});
