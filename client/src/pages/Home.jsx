import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import MapComponent from '../MapComponent';

export default function Home() {
  const { spots, socialPosts, planResult, setForm, setFlashMessage } = useAppContext();
  
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStory, setSelectedStory] = useState('');
  const [likedPosts, setLikedPosts] = useState({});
  const [savedPosts, setSavedPosts] = useState({});
  const [sharedPosts, setSharedPosts] = useState({});

  const stories = spots.slice(0, 8);

  const filteredSpots = useMemo(() => {
    let next = [...spots];
    const query = searchKeyword.trim().toLowerCase();
    if (query) {
      next = next.filter((spot) => {
        const target = `${spot.name || ''} ${spot.category || ''} ${spot.location || ''}`.toLowerCase();
        return target.includes(query);
      });
    }
    return next;
  }, [searchKeyword, spots]);

  const togglePostAction = (setter, postId) => {
    setter((previous) => ({
      ...previous,
      [postId]: !previous[postId],
    }));
  };

  const handleVibeClone = (post) => {
    setForm(prev => ({
      ...prev,
      style: 'Vibe Clone',
      mustVisit: post.location || 'Taipei',
    }));
    setFlashMessage(`Cloning vibe from ${post.username}. Use the Planner on the left to generate!`);
  };

  const compactDescription = (description) => {
    if (!description) return 'No details available.';
    const compact = description.replace(/\s+/g, ' ').trim();
    return compact.length > 150 ? `${compact.slice(0, 150)}...` : compact;
  };

  const plan = planResult?.plan;
  const sourceLabel = planResult?.source || 'none';

  return (
    <>
      <section className="utility-bar">
        <input
          value={searchKeyword}
          onChange={(event) => setSearchKeyword(event.target.value)}
          className="search-input"
          placeholder="Search spots, categories, areas"
        />
      </section>

      <header className="stories-row">
        {stories.map((story, index) => (
          <button
            type="button"
            key={`${story.id}-${index}`}
            className={`story-item button-reset ${selectedStory === story.name ? 'active' : ''}`}
            onClick={() => setSelectedStory(story.name || 'Story')}
          >
            <span className="story-ring">
              <span>{story.name?.slice(0, 1) || 'T'}</span>
            </span>
            <p>{story.name || 'Story'}</p>
          </button>
        ))}
      </header>

      {planResult?.reason && <p className="inline-note" style={{marginBottom: '1rem'}}>Fallback: {planResult.reason}</p>}

      {plan && (
        <article className="post-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="post-header">
            <div className="avatar alt">AI</div>
            <div>
              <h2>{plan.title}</h2>
              <p>Source: {sourceLabel}</p>
            </div>
          </div>
          <p className="post-summary">{plan.summary}</p>
          <div className="post-actions">
            <button type="button" className={`action-btn ${likedPosts.plan ? 'on' : ''}`} onClick={() => togglePostAction(setLikedPosts, 'plan')}>
              {likedPosts.plan ? 'Liked' : 'Like'}
            </button>
            <button type="button" className={`action-btn ${savedPosts.plan ? 'on' : ''}`} onClick={() => togglePostAction(setSavedPosts, 'plan')}>
              {savedPosts.plan ? 'Saved' : 'Save'}
            </button>
          </div>
          <ul className="timeline-list">
            {(plan.steps || []).map((step, index) => (
              <li key={`${step.time || 'time'}-${index}`}>
                <strong>{step.time}</strong>
                <span>{step.activity}</span>
                <small>{step.transport} · {step.note}</small>
              </li>
            ))}
          </ul>
          <MapComponent steps={plan.steps || []} />
        </article>
      )}

      {socialPosts.map((post) => (
        <article key={`post-${post.id}`} className="post-card friend-post glass-effect">
          <div className="post-header">
            <div className="avatar alt">{post.username?.slice(0, 1).toUpperCase() || 'U'}</div>
            <div>
              <h2>{post.username}</h2>
              <p>{post.location} · {new Date(post.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          {post.image_url ? (
            <img src={post.image_url} alt="Post" className="post-image" />
          ) : (
            <div className="post-image placeholder" data-tone={post.id % 4} />
          )}
          <p className="post-summary">{post.content}</p>
          <div className="post-actions">
            <button
              type="button"
              className={`action-btn ${likedPosts[`social-${post.id}`] ? 'on' : ''}`}
              onClick={() => togglePostAction(setLikedPosts, `social-${post.id}`)}
            >
              {likedPosts[`social-${post.id}`] ? 'Liked' : 'Like'}
            </button>
            <button type="button" className="action-btn clone-btn" onClick={() => handleVibeClone(post)}>
              🪄 Vibe Clone
            </button>
          </div>
        </article>
      ))}

      {filteredSpots.map((spot, index) => {
        const postId = `spot-${spot.id || index}`;
        return (
          <article key={spot.id || `${spot.name}-${index}`} className="post-card glass-effect">
            <div className="post-header">
              <div className="avatar">{spot.name?.slice(0, 1) || 'T'}</div>
              <div>
                <h2>{spot.name}</h2>
                <p>{spot.category} · {spot.location}</p>
              </div>
            </div>
            <div className="post-image" data-tone={index % 4} />
            <p className="post-summary">{compactDescription(spot.description)}</p>
            <div className="post-actions">
              <button
                type="button"
                className={`action-btn ${likedPosts[postId] ? 'on' : ''}`}
                onClick={() => togglePostAction(setLikedPosts, postId)}
              >
                {likedPosts[postId] ? 'Liked' : 'Like'}
              </button>
            </div>
          </article>
        );
      })}

      {!filteredSpots.length && (
        <article className="post-card status-panel">
          <h3>No matches found</h3>
          <p>Try another keyword.</p>
        </article>
      )}
    </>
  );
}
