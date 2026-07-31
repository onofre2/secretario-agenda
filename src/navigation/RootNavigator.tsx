import React from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Text, View, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

import TodayScreen from "../screens/TodayScreen";
import AgendaScreen from "../screens/AgendaScreen";
import PatientsScreen from "../screens/PatientsScreen";
import ClinicsScreen from "../screens/ClinicsScreen";
import FinancialScreen from "../screens/FinancialScreen";
import ReportsScreen from "../screens/ReportsScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Tab = createMaterialTopTabNavigator();

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

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        return (
          <View key={route.key} style={styles.tabItem} onTouchEnd={onPress}>
            <Text style={{ fontSize: 18, opacity: isFocused ? 1 : 0.6 }}>{TAB_ICONS[route.name]}</Text>
            <Text style={[styles.tabLabel, { color: isFocused ? colors.primary : colors.textMuted }]}>
              {route.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        tabBarPosition="bottom"
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          swipeEnabled: true,
        }}
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

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 4,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
