import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/tokens';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { ProjectsScreen } from '@/screens/ProjectsScreen';
import { FinanceScreen } from '@/screens/FinanceScreen';
import { BudgetsScreen } from '@/screens/BudgetsScreen';
import { TeamScreen } from '@/screens/TeamScreen';
import { ClientsScreen } from '@/screens/ClientsScreen';

const Tab = createBottomTabNavigator();

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'grid',
  Obras: 'business',
  Financeiro: 'cash',
  Orçamentos: 'document-text',
  Equipe: 'people',
  Clientes: 'person-circle'
};

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 70, paddingBottom: 8, paddingTop: 8 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} color={color} size={size} />
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Obras" component={ProjectsScreen} />
      <Tab.Screen name="Financeiro" component={FinanceScreen} />
      <Tab.Screen name="Orçamentos" component={BudgetsScreen} />
      <Tab.Screen name="Equipe" component={TeamScreen} />
      <Tab.Screen name="Clientes" component={ClientsScreen} />
    </Tab.Navigator>
  );
}
