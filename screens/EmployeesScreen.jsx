import { Feather, Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getCompanySettings } from "../api/companyAPI";
import { getEmployees, updateEmployee } from "../api/employee";
import { getProfile } from "../api/profileApi";
import AddEmployeeModal from "../components/AddEmployeeModal";
import EditEmployeeModal from "../components/EditEmployeeModal";
import EmployeeListItem from "../components/EmployeeListItem";
import { canEditEmployee, DEFAULT_COMPANY_SETTINGS, isManagerLevel } from "../lib/permissions";

const MANAGEMENT_ROLES = ["owner", "admin", "manager"];

const EmployeesScreen = ({ navigation, route }) => {
  // roleScope: az Admin Központból nyitva 'driver' vagy 'management'
  const roleScope = route?.params?.roleScope ?? null;
  const scopeTitle =
    roleScope === "driver" ? "Sofőrök"
    : roleScope === "management" ? "Adminok & Menedzserek"
    : null;

  // --- JOGOSULTSÁG ÁLLAPOTOK ---
  const [userRole, setUserRole] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_COMPANY_SETTINGS);
  const [authLoading, setAuthLoading] = useState(true);

  // --- ÁLLAPOTOK (STATES) ---
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("Összes");

  // Modal állapotok
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const categories = ["Összes", "driver", "manager", "admin"];

  // --- JAVÍTOTT: JOGOSULTSÁG ELLENŐRZÉSE A GETPROFILE ALAPJÁN ---
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        setAuthLoading(true);

        // Egyetlen sorral elintézzük a bejelentkezett user és a profil lekérését:
        const profile = await getProfile();

        if (profile) {
          setUserRole(profile.role);
          getCompanySettings(profile.company_id)
            .then(setSettings)
            .catch(() => {});
        }
      } catch (error) {
        console.error(
          "Jogosultság ellenőrzési hiba (EmployeesScreen):",
          error.message,
        );
      } finally {
        setAuthLoading(false);
      }
    };

    checkUserRole();
  }, []);

  // --- ADATOK BETÖLTÉSE ---
  const fetchEmployees = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const data = await getEmployees();
      setEmployees(data);
    } catch (err) {
      Alert.alert(
        "Hiba",
        "Nem sikerült betölteni az alkalmazottakat: " + err.message,
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Csak akkor töltünk adatot, ha a felhasználó admin vagy manager
  useEffect(() => {
    if (isManagerLevel(userRole)) {
      fetchEmployees();
    }
  }, [fetchEmployees, userRole]);

  // --- MŰVELETEK ---
  const handleOpenEdit = (employee) => {
    // Jogosultság-mátrix: a menedzser csak akkor szerkeszthet sofőrt,
    // ha a tulajdonos ezt engedélyezte.
    if (!canEditEmployee(userRole, employee.role, settings)) {
      Alert.alert(
        "Nincs jogosultság",
        "A tulajdonos beállításai szerint nincs jogosultságod ennek az alkalmazottnak a szerkesztéséhez.",
      );
      return;
    }
    setSelectedEmployee(employee);
    setEditModalVisible(true);
  };

  const handleUpdateEmployee = async (updatedData) => {
    try {
      await updateEmployee(updatedData.id, {
        phone_number: updatedData.phone_number,
        role: updatedData.role,
      });
      Alert.alert("Siker!", "Az alkalmazott adatai elmentve.");
      setEditModalVisible(false);
      fetchEmployees(true);
    } catch (error) {
      Alert.alert("Hiba a mentés során", error.message);
    }
  };

  // --- SZŰRÉS LOGIKA ---
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.full_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchText.toLowerCase());

    // Admin Központból érkező szűkítés (felülírja a chip-szűrőt)
    if (roleScope === "driver") return matchesSearch && emp.role === "driver";
    if (roleScope === "management")
      return matchesSearch && MANAGEMENT_ROLES.includes(emp.role);

    const matchesFilter = filter === "Összes" || emp.role === filter;
    return matchesSearch && matchesFilter;
  });

  // --- 1. RENDERING: Amíg ellenőrizzük a jogosultságot ---
  if (authLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: "white", marginTop: 10 }}>
          Jogosultságok ellenőrzése...
        </Text>
      </SafeAreaView>
    );
  }

  // --- 2. RENDERING: Ha nincs joga (NEM admin/manager/owner) ---
  if (!isManagerLevel(userRole)) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContainer]}>
        <Ionicons name="lock-closed-outline" size={80} color="#ef4444" />
        <Text style={styles.deniedTitle}>Hozzáférés megtagadva</Text>
        <Text style={styles.deniedSubtitle}>
          Ez a felület kizárólag Adminisztrátorok és Menedzserek számára érhető
          el.
        </Text>
      </SafeAreaView>
    );
  }

  // --- 3. RENDERING: Teljes hozzáférés (Admin / Manager / Owner) ---
  return (
    <SafeAreaView style={styles.container}>
      {/* FEJLÉC – csak az Admin Központból nyitott (scope) nézetben */}
      {scopeTitle && (
        <View style={styles.scopeHeader}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.scopeBackBtn}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.scopeTitle}>{scopeTitle}</Text>
        </View>
      )}

      {/* KERESŐ SÁV */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#888" />
          <TextInput
            placeholder="Alkalmazott keresése..."
            placeholderTextColor="#888"
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* HORIZONTÁLIS SZŰRŐK – scope nézetben elrejtve (a kör fix) */}
      {!roleScope && (
      <View style={{ height: 50, marginBottom: 10 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterTab,
                filter === cat && styles.activeFilterTab,
              ]}
              onPress={() => setFilter(cat)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === cat && styles.activeFilterTabText,
                ]}
              >
                {cat.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      )}

      {/* ALKALMAZOTT LISTA */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={{ color: "white", marginTop: 10 }}>
            Adatok betöltése...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleOpenEdit(item)}
            >
              <EmployeeListItem item={item} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                Nincs találat a keresett feltételekkel.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchEmployees(true)}
              tintColor="#fff"
            />
          }
        />
      )}

      {/* SZERKESZTÉS MODAL */}
      <EditEmployeeModal
        visible={editModalVisible}
        employee={selectedEmployee}
        onClose={() => setEditModalVisible(false)}
        onSave={handleUpdateEmployee}
      />

      {/* MEGHÍVÁS MODAL */}
      <AddEmployeeModal
        visible={addModalVisible}
        onClose={() => {
          setAddModalVisible(false);
          fetchEmployees(true);
        }}
      />

      {/* LEBEGŐ HOZZÁADÁS GOMB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setAddModalVisible(true)}
      >
        <Ionicons name="add" size={35} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default EmployeesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A2342" },
  scopeHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  scopeBackBtn: { marginRight: 6, marginLeft: -4 },
  scopeTitle: { color: "white", fontSize: 24, fontWeight: "700", letterSpacing: 0.3 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  searchContainer: { padding: 20 },
  searchBar: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 12,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: "#333" },
  filterContainer: { paddingHorizontal: 20, alignItems: "center" },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  activeFilterTab: { backgroundColor: "white", borderColor: "white" },
  filterTabText: { color: "white", fontWeight: "600", fontSize: 13 },
  activeFilterTabText: { color: "#0A2342" },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  emptyText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#1e3a5f",
    width: 65,
    height: 65,
    borderRadius: 33,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  deniedTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    textAlign: "center",
  },
  deniedSubtitle: {
    color: "#94a3b8",
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },
});
