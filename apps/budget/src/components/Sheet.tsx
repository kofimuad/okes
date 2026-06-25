import { fonts, radius } from "@okes/ui";
import { useEffect, useState, type ReactNode } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../theme";
import { Icon } from "./primitives";

/** Tracks the on-screen keyboard height (works inside Modals, unlike adjustResize). */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return height;
}

/** Bottom-sheet modal with a frosted panel that lifts above the keyboard. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const kb = useKeyboardHeight();
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.anchor, { paddingBottom: kb }]} pointerEvents="box-none">
        <View style={[styles.panel, { backgroundColor: colors.surfaceRaised, borderColor: colors.hairline }]}>
          <View style={[styles.handle, { backgroundColor: colors.hairlineBright }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={styles.body}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#00000099" },
  anchor: { flex: 1, justifyContent: "flex-end" },
  panel: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
    maxHeight: "88%",
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { fontFamily: fonts.displayBold, fontSize: 18, fontWeight: "700" },
  body: { gap: 14, paddingTop: 6, paddingBottom: 8 },
});
