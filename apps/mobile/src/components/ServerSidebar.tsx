import React from 'react'
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useStore } from '@nanostores/react'
import { $servers } from '../store'
import { colors } from '../theme'

const vexLogo = require('../assets/images/vex-logo.png')

interface ServerSidebarProps {
  activeServerId: string | null
  onSelectServer: (serverId: string) => void
  onSelectHome: () => void
  onAddServer: () => void
  onSettings: () => void
}

export function ServerSidebar({
  activeServerId,
  onSelectServer,
  onSelectHome,
  onAddServer,
  onSettings,
}: ServerSidebarProps) {
  const servers = useStore($servers)
  const serverList = Object.values(servers)

  return (
    <View style={styles.container}>
      {/* Home / Vex icon */}
      <TouchableOpacity onPress={onSelectHome} style={styles.homeBtn}>
        <Image source={vexLogo} style={styles.logo} resizeMode="contain" />
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Server list */}
      <ScrollView style={styles.serverList} showsVerticalScrollIndicator={false}>
        {serverList.map((server) => {
          const active = server.serverID === activeServerId
          return (
            <TouchableOpacity
              key={server.serverID}
              onPress={() => onSelectServer(server.serverID)}
              style={[styles.serverBtn, active && styles.serverBtnActive]}
            >
              <Text style={styles.serverInitial}>
                {(server.name ?? 'S').charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          )
        })}

        {/* Add server */}
        <TouchableOpacity style={styles.addBtn} onPress={onAddServer}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Settings gear */}
      <TouchableOpacity onPress={onSettings} style={styles.settingsBtn}>
        <Text style={styles.settingsIcon}>⚙</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 60,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.borderSubtle,
    alignItems: 'center',
    paddingVertical: 8,
  },
  homeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logo: {
    width: 28,
    height: 28,
  },
  divider: {
    width: 32,
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 6,
  },
  serverList: {
    flex: 1,
  },
  serverBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  serverBtnActive: {
    borderRadius: 14,
    backgroundColor: colors.accentDark,
  },
  serverInitial: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  addText: {
    color: colors.muted,
    fontSize: 20,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  settingsIcon: {
    color: colors.muted,
    fontSize: 22,
  },
})
