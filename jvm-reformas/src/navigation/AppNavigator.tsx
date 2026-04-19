import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { ProjectsScreen } from '@/screens/ProjectsScreen';
import { FinanceScreen } from '@/screens/FinanceScreen';
import { BudgetsScreen } from '@/screens/BudgetsScreen';
import { TeamScreen } from '@/screens/TeamScreen';
import { ClientsScreen } from '@/screens/ClientsScreen';
import { NotesScreen } from '@/screens/NotesScreen';

const Tab = createBottomTabNavigator();

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Início': 'grid',
  Obras: 'business',
  Caixa: 'cash',
  'Orç.': 'document-text',
  Equipe: 'people',
  Clientes: 'person-circle',
  Notas: 'create'
};

export function AppNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 68 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 8
        },
        tabBarItemStyle: {
          paddingTop: 2
        },
        tabBarLabelStyle: {
          fontSize: 10,
          paddingBottom: 2
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} color={color} size={size} />
      })}
    >
      <Tab.Screen name="Início" component={DashboardScreen} />
      <Tab.Screen name="Obras" component={ProjectsScreen} />
      <Tab.Screen name="Caixa" component={FinanceScreen} />
      <Tab.Screen name="Orç." component={BudgetsScreen} />
      <Tab.Screen name="Equipe" component={TeamScreen} />
      <Tab.Screen name="Clientes" component={ClientsScreen} />
      <Tab.Screen name="Notas" component={NotesScreen} />
    </Tab.Navigator>
  );
}
