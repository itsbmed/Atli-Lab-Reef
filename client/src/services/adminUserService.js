import { getPublicUsers, updateUserRole } from '@/services/localStore'
import { getAquariums } from '@/services/aquariumStore'
import { getAllAnalysisRecords } from '@/services/analysisStore'

function latestDate(values) {
  const valid = values.filter(Boolean).map((value) => new Date(value)).filter((value) => !Number.isNaN(value.getTime()))
  return valid.length ? new Date(Math.max(...valid)).toISOString() : null
}

export function getAdminUsers() {
  const aquariums = getAquariums()
  const analyses = getAllAnalysisRecords()
  return getPublicUsers().map((user) => {
    const userAquariums = aquariums.filter((item) => item.ownerId === user.id)
    const userAnalyses = analyses.filter((item) => item.ownerId === user.id)
    const completedAnalyses = userAnalyses.filter((item) => item.status === 'completed')
    return {
      ...user,
      aquariumCount: userAquariums.length,
      analysisCount: userAnalyses.length,
      completedAnalysisCount: completedAnalyses.length,
      lastAnalysisAt: latestDate(userAnalyses.map((item) => item.completedAt || item.createdAt)),
      lastActivityAt: latestDate([
        user.lastLoginAt,
        user.createdAt,
        ...userAquariums.map((item) => item.updatedAt || item.createdAt),
        ...userAnalyses.map((item) => item.completedAt || item.createdAt),
      ]),
    }
  }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

export function changeAdminUserRole(actorId, userId, role) {
  updateUserRole(actorId, userId, role)
  return getAdminUsers()
}
