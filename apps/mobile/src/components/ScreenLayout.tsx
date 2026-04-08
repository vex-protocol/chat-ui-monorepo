import React from "react";
import { ImageBackground, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const bgGrid = require("../assets/images/bg-grid.png");
import { colors } from "../theme";

interface ScreenLayoutProps {
    children: React.ReactNode;
    padded?: boolean;
    style?: ViewStyle;
}

export function ScreenLayout({
    children,
    padded = true,
    style,
}: ScreenLayoutProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.root}>
            <ImageBackground
                imageStyle={styles.gridImage}
                resizeMode="repeat"
                source={bgGrid}
                style={styles.background}
            >
                {/* Vignette overlay */}
                <View style={styles.vignette} />
                <View
                    style={[
                        styles.content,
                        padded && { paddingHorizontal: 24 },
                        {
                            paddingBottom: insets.bottom + 16,
                            paddingTop: insets.top + 16,
                        },
                        style,
                    ]}
                >
                    {children}
                </View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    content: {
        flex: 1,
        zIndex: 1,
    },
    gridImage: {
        opacity: 0.15,
    },
    root: {
        backgroundColor: colors.bg,
        flex: 1,
    },
    vignette: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.bg,
        opacity: 0.4,
    },
});
