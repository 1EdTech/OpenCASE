/**
 * Default (opinionated) CFLicense records seeded for every tenant.
 *
 * These cover the spectrum from fully open to fully private and use
 * well-known Creative Commons licenses where applicable — the same
 * family already adopted by real CASE deployments (e.g. Georgia DOE).
 *
 * Each record has a stable UUID so that references (`licenseURI`)
 * remain consistent across tenants and over time.
 */

export interface SeedCFLicense {
  identifier: string
  uri: string
  title: string
  description: string
  licenseText: string
  lastChangeDateTime: string
}

const SEED_TIMESTAMP = '2025-01-01T00:00:00.000Z'

export const DEFAULT_LICENSES: SeedCFLicense[] = [
  {
    identifier: 'c0c0c0c0-0000-4000-a000-000000000001',
    uri: '/ims/case/v1p1/CFLicenses/c0c0c0c0-0000-4000-a000-000000000001',
    title: 'Public Domain (CC0 1.0)',
    description:
      'Anyone can use, share, and build upon this framework with no restrictions.',
    licenseText:
      'CC0 1.0 Universal — Public Domain Dedication\n\n' +
      'The person who associated a work with this deed has dedicated the work to the public domain ' +
      'by waiving all of his or her rights to the work worldwide under copyright law, including all ' +
      'related and neighboring rights, to the extent allowed by law.\n\n' +
      'You can copy, modify, distribute and perform the work, even for commercial purposes, all ' +
      'without asking permission.\n\n' +
      'https://creativecommons.org/publicdomain/zero/1.0/',
    lastChangeDateTime: SEED_TIMESTAMP,
  },
  {
    identifier: 'c0c0c0c0-0000-4000-a000-000000000002',
    uri: '/ims/case/v1p1/CFLicenses/c0c0c0c0-0000-4000-a000-000000000002',
    title: 'Open — Credit Required (CC BY 4.0)',
    description:
      'Free to use, share, and adapt. You must give credit to the author.',
    licenseText:
      'Creative Commons Attribution 4.0 International (CC BY 4.0)\n\n' +
      'You are free to:\n' +
      '- Share — copy and redistribute the material in any medium or format.\n' +
      '- Adapt — remix, transform, and build upon the material for any purpose, even commercially.\n\n' +
      'Under the following terms:\n' +
      '- Attribution — You must give appropriate credit, provide a link to the license, and indicate ' +
      'if changes were made. You may do so in any reasonable manner, but not in any way that suggests ' +
      'the licensor endorses you or your use.\n\n' +
      'No additional restrictions — You may not apply legal terms or technological measures that legally ' +
      'restrict others from doing anything the license permits.\n\n' +
      'https://creativecommons.org/licenses/by/4.0/',
    lastChangeDateTime: SEED_TIMESTAMP,
  },
  {
    identifier: 'c0c0c0c0-0000-4000-a000-000000000003',
    uri: '/ims/case/v1p1/CFLicenses/c0c0c0c0-0000-4000-a000-000000000003',
    title: 'Educational Use (CC BY-NC-SA 4.0)',
    description:
      'Free for educational and non-commercial use. Credit the author. Share improvements under the same terms.',
    licenseText:
      'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)\n\n' +
      'You are free to:\n' +
      '- Share — copy and redistribute the material in any medium or format.\n' +
      '- Adapt — remix, transform, and build upon the material.\n\n' +
      'Under the following terms:\n' +
      '- Attribution — You must give appropriate credit, provide a link to the license, and indicate ' +
      'if changes were made.\n' +
      '- NonCommercial — You may not use the material for commercial purposes.\n' +
      '- ShareAlike — If you remix, transform, or build upon the material, you must distribute your ' +
      'contributions under the same license as the original.\n\n' +
      'No additional restrictions — You may not apply legal terms or technological measures that legally ' +
      'restrict others from doing anything the license permits.\n\n' +
      'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    lastChangeDateTime: SEED_TIMESTAMP,
  },
  {
    identifier: 'c0c0c0c0-0000-4000-a000-000000000004',
    uri: '/ims/case/v1p1/CFLicenses/c0c0c0c0-0000-4000-a000-000000000004',
    title: 'View and Share Only (CC BY-NC-ND 4.0)',
    description:
      'May be viewed and shared in its original form. No modifications or commercial use.',
    licenseText:
      'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)\n\n' +
      'You are free to:\n' +
      '- Share — copy and redistribute the material in any medium or format.\n\n' +
      'Under the following terms:\n' +
      '- Attribution — You must give appropriate credit, provide a link to the license, and indicate ' +
      'if changes were made.\n' +
      '- NonCommercial — You may not use the material for commercial purposes.\n' +
      '- NoDerivatives — If you remix, transform, or build upon the material, you may not distribute ' +
      'the modified material.\n\n' +
      'No additional restrictions — You may not apply legal terms or technological measures that legally ' +
      'restrict others from doing anything the license permits.\n\n' +
      'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    lastChangeDateTime: SEED_TIMESTAMP,
  },
  {
    identifier: 'c0c0c0c0-0000-4000-a000-000000000005',
    uri: '/ims/case/v1p1/CFLicenses/c0c0c0c0-0000-4000-a000-000000000005',
    title: 'Private — All Rights Reserved',
    description:
      'Not for public use. All rights reserved by the author. Written permission required.',
    licenseText:
      'All Rights Reserved\n\n' +
      'This work is protected by copyright. No part of this material may be used, reproduced, ' +
      'distributed, or transmitted in any form or by any means without the prior written permission ' +
      'of the copyright holder.\n\n' +
      'For licensing enquiries, contact the publisher.',
    lastChangeDateTime: SEED_TIMESTAMP,
  },
]

/**
 * License identifiers that grant unauthenticated (public) access
 * to frameworks via the CASE Provider API.
 */
export const PUBLIC_LICENSE_IDS = new Set([
  'c0c0c0c0-0000-4000-a000-000000000001', // Public Domain (CC0 1.0)
  'c0c0c0c0-0000-4000-a000-000000000002', // Open — Credit Required (CC BY 4.0)
  'c0c0c0c0-0000-4000-a000-000000000003', // Educational Use (CC BY-NC-SA 4.0)
])

/**
 * Returns true if the given license identifier allows unauthenticated access.
 * No license (undefined) is treated as private.
 */
export function isPublicLicense (licenseId: string | undefined): boolean {
  return !!licenseId && PUBLIC_LICENSE_IDS.has(licenseId)
}

import {
  DEFAULT_CONCEPTS,
  DEFAULT_SUBJECTS,
  DEFAULT_ITEM_TYPES,
  DEFAULT_ASSOCIATION_GROUPINGS,
} from './defaultDefinitions'

/**
 * Build a definitions index object containing all default seed definitions,
 * ready to be written as `definitions.json`.
 */
export function buildDefaultDefinitionsIndex(): Record<string, Record<string, { docStorageKey: string; value: any }>> {
  const seed = (items: Array<{ identifier: string }>): Record<string, { docStorageKey: string; value: any }> => {
    const map: Record<string, { docStorageKey: string; value: any }> = {}
    for (const item of items) {
      map[item.identifier] = { docStorageKey: '__seed__', value: item }
    }
    return map
  }

  return {
    CFConcepts: seed(DEFAULT_CONCEPTS),
    CFSubjects: seed(DEFAULT_SUBJECTS),
    CFLicenses: seed(DEFAULT_LICENSES),
    CFItemTypes: seed(DEFAULT_ITEM_TYPES),
    CFAssociationGroupings: seed(DEFAULT_ASSOCIATION_GROUPINGS),
  }
}
