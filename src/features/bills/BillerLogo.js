// ---------------------------------------------------------------------------
// BillerLogo - the biller's logo on a small white tile.
// ---------------------------------------------------------------------------
// Uses, in order: the biller's bundled logo (see catalog.js), a picture you
// picked, a catalog logo whose name matches (so typing "Meralco" just works),
// or the biller's first letter on its colour.
// Logos sit on white in both themes, because most brand logos are made for a
// white background.
// ---------------------------------------------------------------------------

import { Image, StyleSheet, Text, View } from 'react-native';

import { findCatalogMatch, logoFor } from '@/features/bills/catalog';

/**
 * @param {object} props
 * @param {{ name:string, color:string, logo_key?:string|null, logo_uri?:string|null }} props.biller
 * @param {number} [props.size]  tile height; the tile is a bit wider than tall
 */
export default function BillerLogo({ biller, size = 44 }) {
  const width = Math.round(size * 1.35);
  const source =
    logoFor(biller.logo_key) ??
    (biller.logo_uri ? { uri: biller.logo_uri } : null) ??
    logoFor(findCatalogMatch(biller.name)?.key);
  const radius = Math.round(size * 0.3);

  if (source) {
    return (
      <View style={[styles.tile, { width, height: size, borderRadius: radius, padding: Math.round(size * 0.1) }]}>
        <Image source={source} style={styles.img} resizeMode="contain" accessibilityLabel={`${biller.name} logo`} />
      </View>
    );
  }

  return (
    <View style={[styles.tile, { width, height: size, borderRadius: radius, backgroundColor: biller.color }]}>
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: Math.round(size * 0.42) }}>
        {(biller.name || '?').trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/** Shape a joined bill row ({ biller_name, ... }) into what BillerLogo wants. */
export function billerOf(bill) {
  return {
    name: bill.biller_name,
    color: bill.biller_color,
    logo_key: bill.biller_logo_key,
    logo_uri: bill.biller_logo_uri,
  };
}

const styles = StyleSheet.create({
  tile: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
});
