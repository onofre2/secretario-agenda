import React from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { colors } from "../theme/colors";

import TodayScreen from "../screens/TodayScreen";
import AgendaScreen from "../screens/AgendaScreen";
import PatientsScreen from "../screens/PatientsScreen";
import ClinicsScreen from "../screens/ClinicsScreen";
import FinancialScreen from "../screens/FinancialScreen";
import ReportsScreen from "../screens/ReportsScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    primary: colors.primary,
    text: colors.text,
  },
};

const TAB_ICONS: Record<string, string> = {
  Hoje: "📅",
  Agenda: "🗓️",
  Pacientes: "🧑‍⚕️",
  Clínicas: "🏥",
  Financeiro: "💰",
  Relatórios: "📊",
  Config: "⚙️",
};

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text },
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>{TAB_ICONS[route.name]}</Text>,
          tabBarLabelStyle: { fontSize: 10 },
        })}
      >
        <Tab.Screen name="Hoje" component={TodayScreen} />
        <Tab.Screen name="Agenda" component={AgendaScreen} />
        <Tab.Screen name="Pacientes" component={PatientsScreen} />
        <Tab.Screen name="Clínicas" component={ClinicsScreen} />
        <Tab.Screen name="Financeiro" component={FinancialScreen} />
        <Tab.Screen name="Relatórios" component={ReportsScreen} />
        <Tab.Screen name="Config" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
