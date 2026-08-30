import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchWeather,
  geocodeCity,
  WeatherData,
  GeocodedPlace,
} from "../services/weatherApi";

type Theme = {
  colors: readonly [string, string, string];
  icon: keyof typeof Ionicons.glyphMap;
};

function weatherTheme(code: number, isDay: boolean): Theme {
  if (code === 0 || code === 1) {
    return {
      colors: isDay
        ? ["#1677ff", "#45b7ff", "#b9e7ff"]
        : ["#071b3a", "#123b69", "#28527c"],
      icon: isDay ? "sunny" : "moon",
    };
  }

  if (code === 2 || code === 3 || (code >= 45 && code <= 48)) {
    return {
      colors: isDay
        ? ["#4b79a1", "#8aa6b8", "#d2dde3"]
        : ["#17283d", "#33495f", "#627488"],
      icon: "cloudy",
    };
  }

  if (code >= 51 && code <= 67 || code >= 80 && code <= 82) {
    return {
      colors: ["#315f85", "#4e83a8", "#86a8be"],
      icon: "rainy",
    };
  }

  if (code >= 71 && code <= 77 || code >= 85 && code <= 86) {
    return {
      colors: ["#527b9b", "#81a4bb", "#c7dce8"],
      icon: "snow",
    };
  }

  if (code >= 95) {
    return {
      colors: ["#202a45", "#384d70", "#6c7d9b"],
      icon: "thunderstorm",
    };
  }

  return {
    colors: ["#1677ff", "#45b7ff", "#b9e7ff"],
    icon: "partly-sunny",
  };
}

function formatHour(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDay(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString([], {
    weekday: "short",
  });
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={21} color="#d8efff" />
      <View>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function SkyCast() {
  const { width } = useWindowDimensions();
  const wide = width >= 800;

  const [city, setCity] = useState("Bengaluru");
  const [query, setQuery] = useState("Bengaluru");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [place, setPlace] = useState<GeocodedPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  async function loadPlace(target: GeocodedPlace) {
    setLoading(true);
    setError("");
    try {
      const data = await fetchWeather(target.latitude, target.longitude);
      setPlace(target);
      setWeather(data);
      setCity(target.name);
      setQuery(target.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load weather.");
    } finally {
      setLoading(false);
    }
  }

  async function searchCity() {
    const value = query.trim();
    if (!value) return;

    Keyboard.dismiss();
    setSearching(true);
    setError("");

    try {
      const results = await geocodeCity(value);
      if (!results.length) {
        throw new Error("City not found. Try another city name.");
      }
      await loadPlace(results[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
      setLoading(false);
    } finally {
      setSearching(false);
    }
  }

  async function useMyLocation() {
    setError("");
    try {
      if (Platform.OS === "web" && !navigator.geolocation) {
        throw new Error("Location is not supported by this browser.");
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        throw new Error("Location permission was not granted.");
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = current.coords;
      const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
      const first = reverse[0];

      const target: GeocodedPlace = {
        name: first?.city || first?.district || "My Location",
        latitude,
        longitude,
        country: first?.country || "",
        admin1: first?.region || "",
      };

      await loadPlace(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get your location.");
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const results = await geocodeCity("Bengaluru");
        if (results[0]) await loadPlace(results[0]);
      } catch {
        setError("Could not load the default city.");
        setLoading(false);
      }
    })();
  }, []);

  const theme = useMemo(
    () => weatherTheme(weather?.current.weather_code ?? 2, weather?.current.is_day === 1),
    [weather]
  );

  const current = weather?.current;
  const daily = weather?.daily;
  const hourly = weather?.hourly;

  return (
    <LinearGradient colors={theme.colors} style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { maxWidth: wide ? 1100 : 700 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>SkyCast</Text>
            <Text style={styles.tagline}>Weather, simplified.</Text>
          </View>

          <Pressable style={styles.locationButton} onPress={useMyLocation}>
            <Ionicons name="locate-outline" size={20} color="#fff" />
            <Text style={styles.locationButtonText}>My location</Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#6b7f93" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={searchCity}
              placeholder="Search city..."
              placeholderTextColor="#7890a4"
              style={styles.input}
              returnKeyType="search"
            />
          </View>

          <Pressable style={styles.searchButton} onPress={searchCity}>
            {searching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#fff" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading && !weather ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading weather...</Text>
          </View>
        ) : weather && current && daily && hourly ? (
          <>
            <View style={styles.hero}>
              <View>
                <Text style={styles.place}>
                  {place?.name || city}
                  {place?.country ? `, ${place.country}` : ""}
                </Text>
                <Text style={styles.updated}>Current conditions</Text>
              </View>

              <View style={styles.currentRow}>
                <Ionicons name={theme.icon} size={82} color="#fff" />
                <View>
                  <Text style={styles.temperature}>
                    {Math.round(current.temperature_2m)}°
                  </Text>
                  <Text style={styles.condition}>{current.condition}</Text>
                  <Text style={styles.feels}>
                    Feels like {Math.round(current.apparent_temperature)}°
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Today</Text>
              <View style={styles.detailsGrid}>
                <Detail
                  icon="water-outline"
                  label="Humidity"
                  value={`${current.relative_humidity_2m}%`}
                />
                <Detail
                  icon="speedometer-outline"
                  label="Wind"
                  value={`${Math.round(current.wind_speed_10m)} km/h`}
                />
                <Detail
                  icon="eye-outline"
                  label="Visibility"
                  value={`${(current.visibility / 1000).toFixed(1)} km`}
                />
                <Detail
                  icon="thermometer-outline"
                  label="Pressure"
                  value={`${Math.round(current.surface_pressure)} hPa`}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Hourly forecast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.hourRow}>
                  {hourly.time.slice(0, 12).map((time, index) => {
                    const code = hourly.weather_code[index];
                    const hourTheme = weatherTheme(
                      code,
                      hourly.is_day[index] === 1
                    );
                    return (
                      <View style={styles.hourItem} key={time}>
                        <Text style={styles.hourText}>{formatHour(time)}</Text>
                        <Ionicons
                          name={hourTheme.icon}
                          size={28}
                          color="#eaf8ff"
                        />
                        <Text style={styles.hourTemp}>
                          {Math.round(hourly.temperature_2m[index])}°
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>7-day forecast</Text>
              {daily.time.slice(0, 7).map((day, index) => {
                const dayTheme = weatherTheme(
                  daily.weather_code[index],
                  true
                );
                return (
                  <View style={styles.dayRow} key={day}>
                    <Text style={styles.dayName}>
                      {index === 0 ? "Today" : formatDay(day)}
                    </Text>
                    <Ionicons
                      name={dayTheme.icon}
                      size={27}
                      color="#eaf8ff"
                    />
                    <Text style={styles.dayCondition}>
                      {daily.condition[index]}
                    </Text>
                    <Text style={styles.dayTemp}>
                      {Math.round(daily.temperature_2m_max[index])}° /{" "}
                      {Math.round(daily.temperature_2m_min[index])}°
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.footer}>
              Weather data by Open-Meteo · Updated automatically
            </Text>
          </>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: "100%",
  },
  content: {
    width: "100%",
    alignSelf: "center",
    padding: 22,
    paddingTop: Platform.OS === "web" ? 38 : 22,
    paddingBottom: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  brand: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  tagline: {
    color: "#d9efff",
    marginTop: 2,
    fontSize: 14,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  locationButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  searchBox: {
    flex: 1,
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    marginLeft: 9,
    color: "#183047",
    fontSize: 16,
    outlineStyle: "none",
  } as any,
  searchButton: {
    minHeight: 50,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: "#102f52",
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  errorBox: {
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    padding: 13,
    borderRadius: 13,
    backgroundColor: "rgba(150,20,20,0.35)",
    marginBottom: 15,
  },
  errorText: {
    color: "#fff",
    flex: 1,
    fontSize: 14,
  },
  loading: {
    minHeight: 350,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
  },
  hero: {
    paddingVertical: 25,
    paddingHorizontal: 5,
  },
  place: {
    color: "#fff",
    fontSize: 27,
    fontWeight: "800",
  },
  updated: {
    color: "#d9efff",
    marginTop: 3,
  },
  currentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
    marginTop: 16,
  },
  temperature: {
    color: "#fff",
    fontSize: 70,
    lineHeight: 76,
    fontWeight: "300",
    letterSpacing: -3,
  },
  condition: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "700",
  },
  feels: {
    color: "#d9efff",
    marginTop: 3,
  },
  card: {
    backgroundColor: "rgba(7, 30, 55, 0.36)",
    borderRadius: 22,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 15,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
  },
  detail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minWidth: "43%",
    flexGrow: 1,
  },
  detailLabel: {
    color: "#b9d4e8",
    fontSize: 12,
  },
  detailValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  hourRow: {
    flexDirection: "row",
    gap: 10,
  },
  hourItem: {
    width: 76,
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    gap: 9,
  },
  hourText: {
    color: "#cce4f4",
    fontSize: 12,
  },
  hourTemp: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  dayRow: {
    minHeight: 51,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.09)",
    gap: 12,
  },
  dayName: {
    color: "#fff",
    width: 62,
    fontWeight: "700",
  },
  dayCondition: {
    color: "#cce4f4",
    flex: 1,
    fontSize: 13,
  },
  dayTemp: {
    color: "#fff",
    fontWeight: "700",
  },
  footer: {
    color: "#d9efff",
    textAlign: "center",
    fontSize: 11,
    marginTop: 20,
  },
});