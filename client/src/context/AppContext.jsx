import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [health, setHealth] = useState(null)
  const [overview, setOverview] = useState(null)
  const [spots, setSpots] = useState([])
  const [socialPosts, setSocialPosts] = useState([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState('luke')
  const [points, setPoints] = useState(0)
  
  const [flashMessage, setFlashMessage] = useState('')
  
  // Shared plan result
  const [planResult, setPlanResult] = useState(null)
  const [form, setForm] = useState({
    style: '文青探索',
    budget: '中等',
    duration: '1 day',
    mustVisit: '台北101',
    weather: '晴天',
  })
  const [planning, setPlanning] = useState(false)

  const parseJsonSafely = async (response) => {
    const raw = await response.text()
    if (!raw) return {}
    try {
      return JSON.parse(raw)
    } catch {
      return { message: raw }
    }
  }

  const refreshPoints = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/user/${user}/points`)
      const data = await parseJsonSafely(res)
      if (data.points !== undefined) setPoints(data.points)
    } catch (err) {
      console.error("Failed to fetch points", err)
    }
  }, [user])

  const addPoints = async (amount) => {
    if (!user) return
    try {
      const res = await fetch('/api/user/add_points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, amount })
      })
      const data = await parseJsonSafely(res)
      if (data.points !== undefined) setPoints(data.points)
      return data
    } catch (err) {
      console.error("Failed to add points", err)
    }
  }

  const spendPoints = async (amount) => {
    if (!user) return
    try {
      const res = await fetch('/api/user/spend_points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, amount })
      })
      const data = await parseJsonSafely(res)
      if (data.points !== undefined) setPoints(data.points)
      return data
    } catch (err) {
      console.error("Failed to spend points", err)
    }
  }

  const loadDashboard = useCallback(async () => {
    setError('')
    try {
      const [healthResponse, overviewResponse, spotsResponse, postsResponse] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/datasets/overview'),
        fetch('/api/spots?limit=20'),
        fetch('/api/posts'),
      ])

      if (!healthResponse.ok || !overviewResponse.ok || !spotsResponse.ok) {
        throw new Error('Unable to initialize from backend services.')
      }

      const [healthJson, overviewJson, spotsJson, postsJson] = await Promise.all([
        parseJsonSafely(healthResponse),
        parseJsonSafely(overviewResponse),
        parseJsonSafely(spotsResponse),
        postsResponse ? parseJsonSafely(postsResponse) : { posts: [] },
      ])

      setHealth(healthJson)
      setOverview(overviewJson)
      setSpots(spotsJson.spots || [])
      setSocialPosts(postsJson.posts || [])
      
      // Also fetch points
      refreshPoints()
    } catch (bootError) {
      setError(bootError.message)
    } finally {
      setLoadingInit(false)
    }
  }, [refreshPoints])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    if (!flashMessage) return undefined
    const timer = setTimeout(() => setFlashMessage(''), 1800)
    return () => clearTimeout(timer)
  }, [flashMessage])

  return (
    <AppContext.Provider value={{
      health, overview, spots, socialPosts, loadingInit,
      error, setError, user, setUser,
      points, setPoints, refreshPoints, addPoints, spendPoints,
      flashMessage, setFlashMessage,
      planResult, setPlanResult,
      form, setForm,
      planning, setPlanning,
      loadDashboard, parseJsonSafely
    }}>
      {children}
    </AppContext.Provider>
  );
};
