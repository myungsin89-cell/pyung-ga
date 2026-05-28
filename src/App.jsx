import React, { useState, useEffect } from 'react';
import { db, ref, set, get, push, onValue } from './firebase.js';

// 점수 선택 버튼 컴포넌트 (3단계용)
function ScoreButton({ label, value, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '0.6rem 1.2rem',
        border: selected ? '2px solid var(--primary-color)' : '1px solid #e0e0e0',
        borderRadius: '8px',
        background: selected ? 'var(--secondary-color)' : 'var(--white)',
        color: selected ? 'var(--primary-dark)' : 'var(--text-muted)',
        fontWeight: selected ? 700 : 500,
        fontSize: '1rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        minWidth: '80px'
      }}
    >
      {label}
    </button>
  );
}

// 별점 컴포넌트 - 반별 지원 (노란색)
// 클릭 1번 → 꽉 찬 별, 같은 별 다시 클릭 → 반별 (0.5점)
function StarRating({ value, onChange }) {
  const TOTAL = 5;

  const handleClick = (starIndex) => {
    // starIndex: 1~5
    if (value === starIndex) {
      // 이미 이 별이 꽉 찼으면 → 반별로
      onChange(starIndex - 0.5);
    } else {
      // 다른 별이거나 반별 상태 → 꽉 찬 별로
      onChange(starIndex);
    }
  };

  // 각 별의 채움 상태 계산: 'full' | 'half' | 'empty'
  const getStarType = (starIndex) => {
    if (value >= starIndex) return 'full';
    if (value >= starIndex - 0.5) return 'half';
    return 'empty';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {Array.from({ length: TOTAL }).map((_, i) => {
          const starIndex = i + 1;
          const type = getStarType(starIndex);
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(starIndex)}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                lineHeight: 1,
                fontSize: '2.2rem',
                position: 'relative',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {type === 'full' && (
                <span style={{ color: '#f5c518' }}>★</span>
              )}
              {type === 'half' && (
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  <span style={{ color: '#ddd' }}>★</span>
                  <span style={{
                    position: 'absolute', left: 0, top: 0,
                    width: '50%', overflow: 'hidden',
                    color: '#f5c518'
                  }}>★</span>
                </span>
              )}
              {type === 'empty' && (
                <span style={{ color: '#ddd' }}>★</span>
              )}
            </button>
          );
        })}
        <span style={{
          marginLeft: '8px',
          fontWeight: 700,
          fontSize: '1.1rem',
          color: value ? '#f5c518' : '#ccc',
          minWidth: '3rem'
        }}>
          {value ? `${value}점` : '—'}
        </span>
      </div>
      <span style={{ fontSize: '0.78rem', color: '#aaa', marginLeft: '2px' }}>
        같은 별을 다시 누르면 반별(0.5점)이 됩니다.
      </span>
    </div>
  );
}


function App() {
  const [view, setView] = useState('home');
  const [joinCode, setJoinCode] = useState('');
  const [createData, setCreateData] = useState({
    title: '',
    groupCount: 6,
    selfEval: false,
    criteria: ['협동심', '발표 내용'],
    scoreType: '3level',
    groupQuestions: ['이 모둠의 잘한 점이나 피드백을 적어주세요.'],
    allQuestions: []
  });
  const [generatedCode, setGeneratedCode] = useState(null);
  const [activeEval, setActiveEval] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFeedbackGroup, setSelectedFeedbackGroup] = useState(0);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [existingSubmissionKey, setExistingSubmissionKey] = useState(null); // Firebase key for update

  const goHome = () => {
    setView('home');
    setGeneratedCode(null);
    setJoinCode('');
    setActiveEval(null);
    setSubmissions([]);
    setScoreState({});
    setGroupFeedbackState({});
    setAllFeedbackState({});
    setEvaluatorGroup('');
    setSelectedFeedbackGroup(0);
    setExistingSubmission(null);
    setExistingSubmissionKey(null);
  };

  // ---- 평가 만들기 ----
  const handleAddCriteria = () => {
    setCreateData({ ...createData, criteria: [...createData.criteria, '새 평가 항목'] });
  };
  const handleCriteriaChange = (index, value) => {
    const newCriteria = [...createData.criteria];
    newCriteria[index] = value;
    setCreateData({ ...createData, criteria: newCriteria });
  };
  const handleRemoveCriteria = (index) => {
    const newCriteria = createData.criteria.filter((_, i) => i !== index);
    setCreateData({ ...createData, criteria: newCriteria });
  };

  const handleAddGroupQuestion = () => {
    setCreateData(prev => ({ ...prev, groupQuestions: [...(prev.groupQuestions || []), ''] }));
  };
  const handleGroupQuestionChange = (index, value) => {
    setCreateData(prev => {
      const newQuestions = [...(prev.groupQuestions || [])];
      newQuestions[index] = value;
      return { ...prev, groupQuestions: newQuestions };
    });
  };
  const handleRemoveGroupQuestion = (index) => {
    setCreateData(prev => ({
      ...prev,
      groupQuestions: (prev.groupQuestions || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddAllQuestion = () => {
    setCreateData(prev => ({ ...prev, allQuestions: [...(prev.allQuestions || []), ''] }));
  };
  const handleAllQuestionChange = (index, value) => {
    setCreateData(prev => {
      const newQuestions = [...(prev.allQuestions || [])];
      newQuestions[index] = value;
      return { ...prev, allQuestions: newQuestions };
    });
  };
  const handleRemoveAllQuestion = (index) => {
    setCreateData(prev => ({
      ...prev,
      allQuestions: (prev.allQuestions || []).filter((_, i) => i !== index)
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createData.title) return alert('평가 제목을 입력해주세요.');
    setIsLoading(true);

    // 중복 방지를 위해 코드 생성 후 DB에 없는 코드인지 확인
    let code;
    let exists = true;
    while (exists) {
      code = Math.floor(1000 + Math.random() * 9000).toString();
      const snapshot = await get(ref(db, `evaluations/${code}`));
      exists = snapshot.exists();
    }

    try {
      await set(ref(db, `evaluations/${code}`), {
        ...createData,
        createdAt: Date.now(),
        status: 'open'
      });
      setGeneratedCode(code);
      setJoinCode(code);
      setActiveEval(createData);
    } catch (error) {
      alert('오류: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ---- 평가 참여 ----
  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (joinCode.length !== 4) return alert('4자리 코드를 입력해주세요.');
    setIsLoading(true);
    try {
      const snapshot = await get(ref(db, `evaluations/${joinCode}`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.status === 'closed') {
          return alert('이 평가는 선생님에 의해 마감되었습니다.');
        }
        // Firebase는 배열을 객체로 저장하므로 다시 배열로 변환
        if (data.criteria && !Array.isArray(data.criteria)) {
          data.criteria = Object.values(data.criteria);
        }
        if (data.groupQuestions) {
          if (!Array.isArray(data.groupQuestions)) {
            data.groupQuestions = Object.values(data.groupQuestions);
          }
        } else if (data.useFeedback) {
          data.groupQuestions = ['평가 의견'];
        } else {
          data.groupQuestions = [];
        }
        if (data.allQuestions) {
          if (!Array.isArray(data.allQuestions)) {
            data.allQuestions = Object.values(data.allQuestions);
          }
        } else {
          data.allQuestions = [];
        }
        setActiveEval(data);
        setView('select-group');
      } else {
        alert('존재하지 않는 코드입니다. 다시 확인해주세요.');
      }
    } catch (error) {
      alert('오류: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ---- 평가 점수 상태 (라디오 대신 state로 관리) ----
  const [scoreState, setScoreState] = useState({});
  const [groupFeedbackState, setGroupFeedbackState] = useState({});
  const [allFeedbackState, setAllFeedbackState] = useState({});
  const [evaluatorGroup, setEvaluatorGroup] = useState('');
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [evalError, setEvalError] = useState(''); // 평가 제출 오류 메시지

  // 모둠 선택 시 중복 제출 여부 확인 후 기존 데이터 폼에 채움
  const handleGroupSelect = async (groupNum) => {
    setEvaluatorGroup(groupNum);
    setExistingSubmission(null);
    setExistingSubmissionKey(null);
    setScoreState({});
    setGroupFeedbackState({});
    setAllFeedbackState({});
    setEvalError('');
    if (!groupNum) return;
    setIsCheckingDuplicate(true);
    try {
      const snapshot = await get(ref(db, `evaluations/${joinCode}/submissions`));
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          const sub = child.val();
          if (String(sub.evaluatorGroup) === String(groupNum)) {
            setExistingSubmission(sub);
            setExistingSubmissionKey(child.key);
            // 기존 점수를 scoreState에 불러오기
            const newScoreState = {};
            Object.entries(sub.scores || {}).forEach(([tIdx, criteriaScores]) => {
              Object.entries(criteriaScores).forEach(([cIdx, score]) => {
                newScoreState[`${tIdx}_${cIdx}`] = String(score);
              });
            });
            setScoreState(newScoreState);
            
            // 기존 모둠 피드백 불러오기
            const newGroupFeedback = {};
            if (sub.groupFeedbacks) {
              Object.entries(sub.groupFeedbacks).forEach(([tIdx, questionsObj]) => {
                newGroupFeedback[tIdx] = { ...questionsObj };
              });
            } else if (sub.feedbacks) {
              // 하위 호환성 (구버전 피드백)
              Object.entries(sub.feedbacks).forEach(([tIdx, text]) => {
                newGroupFeedback[tIdx] = { 0: text };
              });
            }
            setGroupFeedbackState(newGroupFeedback);

            // 기존 전체 피드백 불러오기
            const newAllFeedback = {};
            if (sub.allFeedbacks) {
              Object.entries(sub.allFeedbacks).forEach(([qIdx, text]) => {
                newAllFeedback[qIdx] = text;
              });
            }
            setAllFeedbackState(newAllFeedback);
          }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const setScore = (targetIdx, cIdx, value) => {
    setScoreState(prev => ({
      ...prev,
      [`${targetIdx}_${cIdx}`]: value
    }));
  };

  // ---- 평가 제출 (신규 또는 수정) ----
  const handleEvaluateSubmit = async (e) => {
    e.preventDefault();
    setEvalError('');
    if (!evaluatorGroup) {
      setEvalError('⚠️ 우리 모둠을 먼저 선택해주세요!');
      return;
    }

    // criteria가 배열이 아닌 경우 방어 변환
    const criteria = Array.isArray(activeEval.criteria)
      ? activeEval.criteria
      : Object.values(activeEval.criteria || {});

    // 모든 항목에 점수가 입력됐는지 검증
    for (let t = 0; t < activeEval.groupCount; t++) {
      if (!activeEval.selfEval && t + 1 === parseInt(evaluatorGroup)) continue;
      for (let c = 0; c < criteria.length; c++) {
        if (!scoreState[`${t}_${c}`]) {
          setEvalError(`⚠️ ${t + 1}모둠의 “${criteria[c]}” 항목을 선택해주세요.`);
          // 해당 카드로 스크롤
          document.querySelector('.evaluation-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
    }

    const result = {
      evaluatorGroup: parseInt(evaluatorGroup),
      scores: {},
      groupFeedbacks: groupFeedbackState,
      allFeedbacks: allFeedbackState,
      submittedAt: Date.now()
    };

    for (let t = 0; t < activeEval.groupCount; t++) {
      if (!activeEval.selfEval && t + 1 === parseInt(evaluatorGroup)) continue;
      result.scores[t] = {};
      for (let c = 0; c < criteria.length; c++) {
        result.scores[t][c] = parseFloat(scoreState[`${t}_${c}`]);
      }
    }

    setIsLoading(true);
    try {
      if (existingSubmissionKey) {
        // 기존 제출 수정 (set으로 덮어쓰기)
        await set(ref(db, `evaluations/${joinCode}/submissions/${existingSubmissionKey}`), result);
        alert('평가가 수정되었습니다! 수고하셨습니다.');
      } else {
        // 신규 제출
        await push(ref(db, `evaluations/${joinCode}/submissions`), result);
        alert('평가가 성공적으로 제출되었습니다! 수고하셨습니다.');
      }
      goHome();
    } catch (error) {
      alert('제출 오류: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ---- 대시보드: 실시간 제출 현황 ----
  useEffect(() => {
    if (view === 'dashboard' && joinCode) {
      const subsRef = ref(db, `evaluations/${joinCode}/submissions`);
      const unsubscribe = onValue(subsRef, (snapshot) => {
        const subs = [];
        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            subs.push({ id: child.key, ...child.val() });
          });
        }
        setSubmissions(subs);
      });
      return () => unsubscribe();
    }
  }, [view, joinCode]);

  // ---- 평가 마감 ----
  const handleCloseEval = async () => {
    if (!window.confirm('정말 이 평가를 마감하시겠습니까?')) return;
    try {
      await set(ref(db, `evaluations/${joinCode}/status`), 'closed');
      alert('평가가 마감되었습니다.');
    } catch (e) {
      alert('오류: ' + e.message);
    }
  };

  // ---- 모둠별 총점 계산 ----
  const calculateTotalScores = () => {
    if (!activeEval) return [];
    const totals = Array(activeEval.groupCount).fill(0);
    submissions.forEach(sub => {
      if (!sub.scores) return;
      Object.entries(sub.scores).forEach(([targetIdx, criteriaScores]) => {
        Object.values(criteriaScores).forEach(score => {
          totals[parseInt(targetIdx)] += score;
        });
      });
    });
    return totals;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 onClick={goHome} style={{ cursor: 'pointer' }}>모둠 평가 앱</h1>
      </header>

      <main className="app-content">
        {/* HOME */}
        {view === 'home' && (
          <div className="home-screen fade-in">
            <h2>어떤 작업을 진행하시겠습니까?</h2>
            <div className="home-buttons">
              <button className="btn-primary btn-large" onClick={() => setView('join')}>
                평가 참여하기
              </button>
              <button className="btn-secondary btn-large" onClick={() => setView('create')}>
                새로운 평가 만들기 (교사용)
              </button>
              <button className="btn-outline btn-large" onClick={() => setView('teacher-join')}>
                대시보드 확인하기 (교사용)
              </button>
            </div>
          </div>
        )}

        {/* JOIN (학생) */}
        {view === 'join' && (
          <div className="join-screen fade-in">
            <h2>평가 참여하기</h2>
            <p className="subtitle">선생님께서 알려주신 4자리 코드를 입력해주세요.</p>
            <form className="join-form" onSubmit={handleJoinSubmit}>
              <input
                type="text"
                maxLength={4}
                placeholder="0000"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="code-input"
                autoFocus
              />
              <div className="button-group">
                <button type="button" className="btn-outline" onClick={goHome}>뒤로가기</button>
                <button type="submit" className="btn-primary" disabled={isLoading}>
                  {isLoading ? '확인 중...' : '입장하기'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TEACHER JOIN (교사 대시보드 재진입) */}
        {view === 'teacher-join' && (
          <div className="join-screen fade-in">
            <h2>교사 대시보드 입장</h2>
            <p className="subtitle">이전에 만든 평가의 4자리 코드를 입력해주세요.</p>
            <form className="join-form" onSubmit={async (e) => {
              e.preventDefault();
              if (joinCode.length !== 4) return alert('4자리 코드를 입력해주세요.');
              setIsLoading(true);
              try {
                const snapshot = await get(ref(db, `evaluations/${joinCode}`));
                if (snapshot.exists()) {
                  const data = snapshot.val();
                  // Firebase는 배열을 객체로 저장하므로 다시 배열로 변환
                  if (data.criteria && !Array.isArray(data.criteria)) {
                    data.criteria = Object.values(data.criteria);
                  }
                  if (data.groupQuestions) {
                    if (!Array.isArray(data.groupQuestions)) {
                      data.groupQuestions = Object.values(data.groupQuestions);
                    }
                  } else if (data.useFeedback) {
                    data.groupQuestions = ['평가 의견'];
                  } else {
                    data.groupQuestions = [];
                  }
                  if (data.allQuestions) {
                    if (!Array.isArray(data.allQuestions)) {
                      data.allQuestions = Object.values(data.allQuestions);
                    }
                  } else {
                    data.allQuestions = [];
                  }
                  setActiveEval(data);
                  setView('dashboard');
                } else {
                  alert('존재하지 않는 코드입니다.');
                }
              } catch (err) {
                alert('오류: ' + err.message);
              } finally {
                setIsLoading(false);
              }
            }}>
              <input
                type="text"
                maxLength={4}
                placeholder="0000"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="code-input"
                autoFocus
              />
              <div className="button-group">
                <button type="button" className="btn-outline" onClick={goHome}>뒤로가기</button>
                <button type="submit" className="btn-primary" disabled={isLoading}>
                  {isLoading ? '확인 중...' : '대시보드 입장'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CREATE */}
        {view === 'create' && (
          <div className="create-screen fade-in">
            {!generatedCode ? (
              <>
                <h2>새로운 평가 만들기</h2>
                <p className="subtitle">평가 기준과 방식을 설정해주세요.</p>
                <form className="create-form" onSubmit={handleCreateSubmit}>
                  <div className="form-group">
                    <label>평가 제목</label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="예: 3단원 과학 발표 평가"
                      value={createData.title}
                      onChange={(e) => setCreateData({ ...createData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>총 모둠 수</label>
                      <input
                        type="number"
                        className="text-input"
                        min="2" max="20"
                        value={createData.groupCount}
                        onChange={(e) => setCreateData({ ...createData, groupCount: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label>채점 방식</label>
                      <select
                        className="text-input"
                        value={createData.scoreType}
                        onChange={(e) => setCreateData({ ...createData, scoreType: e.target.value })}
                      >
                        <option value="3level">3단계 기호 (◎ 3점 / ○ 2점 / △ 1점)</option>
                        <option value="5star">5점 만점 별점 (1~5점)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group checkbox-group" style={{ borderBottom: '1px dashed var(--border-color)', paddingBottom: '1rem' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', marginTop: 0 }}>
                      <input
                        type="checkbox"
                        checked={createData.selfEval}
                        onChange={(e) => setCreateData({ ...createData, selfEval: e.target.checked })}
                      />
                      자기 모둠 평가 허용
                    </label>
                  </div>

                  <div className="form-group">
                    <label>평가 항목 설정</label>
                    <div className="criteria-list">
                      {createData.criteria.map((item, idx) => (
                        <div key={idx} className="criteria-item">
                          <input
                            type="text"
                            className="text-input"
                            value={item}
                            onChange={(e) => handleCriteriaChange(idx, e.target.value)}
                            required
                          />
                          {createData.criteria.length > 1 && (
                            <button type="button" className="btn-outline btn-small" onClick={() => handleRemoveCriteria(idx)}>삭제</button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button type="button" className="btn-secondary btn-small add-btn" onClick={handleAddCriteria}>
                      + 항목 추가
                    </button>
                  </div>

                  <div className="form-group" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
                    <label>모둠별 서술형 질문 설정 (선택)</label>
                    <p className="form-group-description">
                      각 모둠을 평가할 때 개별적으로 입력받을 주관식 질문입니다.
                    </p>
                    <div className="criteria-list">
                      {createData.groupQuestions && createData.groupQuestions.map((qText, idx) => (
                        <div key={idx} className="criteria-item">
                          <input
                            type="text"
                            className="text-input"
                            value={qText}
                            onChange={(e) => handleGroupQuestionChange(idx, e.target.value)}
                            placeholder="예: 이 모둠의 좋았던 점과 그 이유는?"
                            required
                          />
                          <button type="button" className="btn-outline btn-small" onClick={() => handleRemoveGroupQuestion(idx)}>삭제</button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="btn-secondary btn-small add-btn" onClick={handleAddGroupQuestion}>
                      + 질문 추가
                    </button>
                  </div>

                  <div className="form-group" style={{ borderBottom: '1px dashed var(--border-color)', paddingBottom: '1rem' }}>
                    <label>전체 대상 서술형 질문 설정 (선택)</label>
                    <p className="form-group-description">
                      모든 모둠 평가가 끝난 후 마지막에 한 번만 답하는 공통 질문입니다. (예: 베스트 학생/기여객 추천, 전체 소감)
                    </p>
                    <div className="criteria-list">
                      {createData.allQuestions && createData.allQuestions.map((qText, idx) => (
                        <div key={idx} className="criteria-item">
                          <input
                            type="text"
                            className="text-input"
                            value={qText}
                            onChange={(e) => handleAllQuestionChange(idx, e.target.value)}
                            placeholder="예: 오늘 전체 발표에서 가장 활약한 베스트 학생은 누구인가요?"
                            required
                          />
                          <button type="button" className="btn-outline btn-small" onClick={() => handleRemoveAllQuestion(idx)}>삭제</button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="btn-secondary btn-small add-btn" onClick={handleAddAllQuestion}>
                      + 질문 추가
                    </button>
                  </div>

                  <div className="button-group" style={{ marginTop: '2rem' }}>
                    <button type="button" className="btn-outline" onClick={goHome}>취소</button>
                    <button type="submit" className="btn-primary" disabled={isLoading}>
                      {isLoading ? '생성 중...' : '평가 생성 및 코드 발급'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="code-result-screen fade-in">
                <h2>평가 코드가 생성되었습니다!</h2>
                <p className="subtitle">학생들에게 아래 코드를 안내해주세요.</p>
                <div className="generated-code-box">{generatedCode}</div>
                <div className="button-group">
                  <button className="btn-outline" onClick={goHome}>홈으로</button>
                  <button className="btn-primary" onClick={() => setView('dashboard')}>교사 대시보드 입장</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SELECT GROUP (Student) */}
        {view === 'select-group' && activeEval && (
          <div className="join-screen fade-in">
            <h2>우리 모둠 선택</h2>
            <p className="subtitle">{activeEval.title}에 참여합니다.<br />본인의 모둠을 선택해주세요.</p>
            
            <div className="join-form" style={{ gap: '1.5rem', width: '100%', maxWidth: '400px' }}>
              <div className="form-group" style={{ width: '100%', textAlign: 'left' }}>
                <label style={{ fontSize: '1rem', color: 'var(--primary-dark)', fontWeight: 600 }}>모둠 선택</label>
                <select 
                  className="text-input" 
                  style={{ width: '100%', marginTop: '0.5rem' }} 
                  value={evaluatorGroup} 
                  onChange={(e) => handleGroupSelect(e.target.value)}
                >
                  <option value="" disabled>모둠을 선택하세요</option>
                  {Array.from({ length: activeEval.groupCount }).map((_, i) => (
                    <option key={i} value={i + 1}>{i + 1}모둠</option>
                  ))}
                </select>
                {isCheckingDuplicate && (
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>제출 내역 확인 중...</p>
                )}
              </div>

              {existingSubmission && (
                <div style={{ 
                  background: '#e8f5e9', 
                  border: '1px solid var(--primary-light)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '0.85rem 1.25rem', 
                  width: '100%', 
                  textAlign: 'left',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem' 
                }}>
                  <span style={{ fontSize: '1.2rem' }}>✏️</span>
                  <span style={{ color: 'var(--primary-dark)', fontWeight: 600, fontSize: '0.9rem' }}>
                    이전에 제출한 평가가 있습니다. 입장 후 내용을 수정할 수 있습니다.
                  </span>
                </div>
              )}

              <div className="button-group">
                <button type="button" className="btn-outline" onClick={() => {
                  setEvaluatorGroup('');
                  setExistingSubmission(null);
                  setExistingSubmissionKey(null);
                  setScoreState({});
                  setGroupFeedbackState({});
                  setAllFeedbackState({});
                  setView('join');
                }}>뒤로가기</button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  disabled={!evaluatorGroup || isCheckingDuplicate}
                  onClick={() => setView('evaluate')}
                >
                  {existingSubmission ? '평가 수정하기' : '평가 시작하기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EVALUATE (Student) */}
        {view === 'evaluate' && activeEval && (
          <div className="evaluate-screen fade-in">
            <div className="screen-header">
              <h2>{activeEval.title}</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="badge" style={{ background: 'var(--primary-dark)' }}>우리 모둠: {evaluatorGroup}모둠</span>
                <span className="badge">코드: {joinCode}</span>
              </div>
            </div>

            <form className="evaluate-form" onSubmit={handleEvaluateSubmit}>
              {/* 이미 제출한 경우: 안내만 표시 */}
              {existingSubmission && (
                <div style={{ background: '#e8f5e9', border: '1px solid var(--primary-light)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>✏️</span>
                  <span style={{ color: 'var(--primary-dark)', fontWeight: 600, fontSize: '0.9rem' }}>
                    이전에 제출한 평가가 있습니다. 수정 후 다시 제출하면 업데이트됩니다.
                  </span>
                </div>
              )}

              <div className="evaluation-list">
                {Array.from({ length: activeEval.groupCount }).map((_, targetIdx) => {
                  // 자기 모둠 평가가 비허용되었고, 자기 모둠 카드이면 렌더링 건너뜀
                  if (!activeEval.selfEval && targetIdx + 1 === parseInt(evaluatorGroup)) return null;

                  return (
                    <div key={targetIdx} className="eval-target-card">
                      <h3>{targetIdx + 1}모둠 평가</h3>
                      {activeEval.criteria.map((criterion, cIdx) => (
                        <div key={cIdx} className="eval-criterion">
                          <label>{criterion}</label>
                          <div className="score-options">
                            {activeEval.scoreType === '3level' ? (
                              <>
                                <ScoreButton label="◎ (3점)" value="3" selected={scoreState[`${targetIdx}_${cIdx}`] === '3'} onClick={() => setScore(targetIdx, cIdx, '3')} />
                                <ScoreButton label="○ (2점)" value="2" selected={scoreState[`${targetIdx}_${cIdx}`] === '2'} onClick={() => setScore(targetIdx, cIdx, '2')} />
                                <ScoreButton label="△ (1점)" value="1" selected={scoreState[`${targetIdx}_${cIdx}`] === '1'} onClick={() => setScore(targetIdx, cIdx, '1')} />
                              </>
                            ) : (
                              <StarRating
                                value={scoreState[`${targetIdx}_${cIdx}`] ? Number(scoreState[`${targetIdx}_${cIdx}`]) : 0}
                                onChange={(val) => setScore(targetIdx, cIdx, String(val))}
                              />
                            )}
                          </div>
                        </div>
                      ))}

                      {/* 모둠별 서술형 질문 입력란 */}
                      {activeEval.groupQuestions && activeEval.groupQuestions.length > 0 && (
                        <div className="eval-feedback" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                          {activeEval.groupQuestions.map((qText, qIdx) => (
                            <div key={qIdx}>
                              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                {qText} (선택)
                              </label>
                              <textarea
                                className="text-input"
                                placeholder="답변을 자유롭게 적어주세요."
                                rows="2"
                                style={{ width: '100%' }}
                                value={(groupFeedbackState[targetIdx] && groupFeedbackState[targetIdx][qIdx]) || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGroupFeedbackState(prev => {
                                    const groupData = prev[targetIdx] ? { ...prev[targetIdx] } : {};
                                    groupData[qIdx] = val;
                                    return { ...prev, [targetIdx]: groupData };
                                  });
                                }}
                              ></textarea>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 전체 대상 서술형 질문 입력란 */}
              {activeEval.allQuestions && activeEval.allQuestions.length > 0 && (
                <div style={{
                  background: 'var(--white)',
                  border: '1px solid var(--primary-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-sm)',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{
                    color: 'var(--primary-dark)',
                    marginBottom: '1.2rem',
                    fontSize: '1.2rem',
                    borderBottom: '2px solid var(--secondary-color)',
                    padding: '0.5rem 0'
                  }}>
                    전체 공통 질문 평가
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {activeEval.allQuestions.map((qText, qIdx) => (
                      <div key={qIdx}>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                          {qText} (선택)
                        </label>
                        <textarea
                          className="text-input"
                          placeholder="답변을 자유롭게 적어주세요."
                          rows="3"
                          style={{ width: '100%' }}
                          value={allFeedbackState[qIdx] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAllFeedbackState(prev => ({
                              ...prev,
                              [qIdx]: val
                            }));
                          }}
                        ></textarea>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="button-group" style={{ marginTop: '2rem', flexDirection: 'column', gap: '1rem' }}>
                {evalError && (
                  <div style={{
                    background: '#fdecea',
                    border: '1px solid #f44336',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1.25rem',
                    color: '#c62828',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    textAlign: 'center'
                  }}>
                    {evalError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                  <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setView('select-group')}>뒤로가기</button>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isLoading}>
                    {isLoading ? '제출 중...' : existingSubmission ? '평가 수정하기' : '평가 제출하기'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* DASHBOARD (Teacher) */}
        {view === 'dashboard' && activeEval && (
          <div className="dashboard-screen fade-in">
            <div className="screen-header">
              <h2>{activeEval.title} 대시보드</h2>
              <span className="badge">코드: {joinCode}</span>
            </div>

            <div className="dashboard-stats">
              <div className="stat-card">
                <span className="stat-value">{submissions.length} / {activeEval.groupCount}</span>
                <span className="stat-label">제출 완료 모둠</span>
              </div>
              <div className="stat-card">
                <span className="stat-value" style={{ color: 'var(--primary-light)' }}>{submissions.length * activeEval.criteria.length}</span>
                <span className="stat-label">누적 평가 항목 수</span>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--primary-dark)' }}>모둠별 누적 획득 점수</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                카드를 클릭하면 해당 모둠의 피드백을 볼 수 있습니다.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                {calculateTotalScores().map((totalScore, idx) => {
                  const isSelected = selectedFeedbackGroup === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedFeedbackGroup(isSelected ? null : idx)}
                      style={{
                        padding: '1rem',
                        background: isSelected ? 'var(--primary-color)' : 'var(--white)',
                        border: isSelected ? '2px solid var(--primary-dark)' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        boxShadow: isSelected ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.25s',
                        transform: isSelected ? 'translateY(-3px)' : 'none'
                      }}
                    >
                      <div style={{ fontWeight: 600, color: isSelected ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                        {idx + 1}모둠
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: isSelected ? 'var(--white)' : 'var(--primary-color)' }}>
                        {totalScore}점
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 피드백 및 점수 상세 패널: 카드 클릭 시 아래에 펼침 */}
              {selectedFeedbackGroup !== null && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1.5rem',
                  background: 'var(--secondary-color)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--primary-light)',
                  animation: 'fadeIn 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem'
                }}>
                  <h4 style={{ color: 'var(--primary-dark)', fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>
                    {selectedFeedbackGroup + 1}모둠 상세 평가 결과
                  </h4>

                  {/* 1. 세부 점수 내역 */}
                  <div style={{
                    background: 'var(--white)',
                    padding: '1.2rem',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <h5 style={{ fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.8rem', fontSize: '0.95rem' }}>
                      📊 모둠별 세부 채점 내역
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {(() => {
                        const targetSubmissions = submissions.filter(sub => sub.scores && sub.scores[selectedFeedbackGroup] !== undefined);
                        if (targetSubmissions.length === 0) {
                          return <p style={{ color: '#aaa', fontSize: '0.85rem' }}>아직 채점한 모둠이 없습니다.</p>;
                        }
                        return targetSubmissions.map((sub, i) => {
                          const criteriaScores = sub.scores[selectedFeedbackGroup];
                          const totalGiven = Object.values(criteriaScores).reduce((a, b) => a + b, 0);
                          
                          return (
                            <div key={i} style={{
                              padding: '0.8rem 1rem',
                              background: 'var(--bg-color)',
                              borderRadius: 'var(--radius-sm)',
                              borderLeft: '4px solid var(--primary-color)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '0.5rem'
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                                  {sub.evaluatorGroup}모둠의 채점
                                </span>
                                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                  {activeEval.criteria.map((cName, cIdx) => {
                                    const scoreVal = criteriaScores[cIdx];
                                    let scoreStr = `${scoreVal}점`;
                                    if (activeEval.scoreType === '3level') {
                                      if (scoreVal === 3) scoreStr = '◎ (3점)';
                                      else if (scoreVal === 2) scoreStr = '○ (2점)';
                                      else if (scoreVal === 1) scoreStr = '△ (1점)';
                                    }
                                    return `${cName}: ${scoreStr}`;
                                  }).join(' / ')}
                                </span>
                              </div>
                              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary-dark)' }}>
                                합계: {totalGiven}점
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* 2. 서술형 피드백 내역 */}
                  {activeEval.groupQuestions && activeEval.groupQuestions.length > 0 && (
                    <div>
                      <h5 style={{ fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.8rem', fontSize: '0.95rem' }}>
                        💬 서술형 피드백 의견
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {activeEval.groupQuestions.map((qText, qIdx) => {
                          const answers = submissions
                            .filter(sub => {
                              if (sub.groupFeedbacks && sub.groupFeedbacks[selectedFeedbackGroup] && sub.groupFeedbacks[selectedFeedbackGroup][qIdx]) {
                                return true;
                              }
                              if (qIdx === 0 && sub.feedbacks && sub.feedbacks[selectedFeedbackGroup]) {
                                return true;
                              }
                              return false;
                            })
                            .map(sub => {
                              const text = sub.groupFeedbacks
                                ? sub.groupFeedbacks[selectedFeedbackGroup][qIdx]
                                : sub.feedbacks[selectedFeedbackGroup];
                              return {
                                evaluatorGroup: sub.evaluatorGroup,
                                text: text
                              };
                            });

                          return (
                            <div key={qIdx} style={{
                              background: 'var(--white)',
                              padding: '1.2rem',
                              borderRadius: 'var(--radius-md)',
                              boxShadow: 'var(--shadow-sm)',
                              border: '1px solid var(--border-color)'
                            }}>
                              <h6 style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.6rem', fontSize: '0.9rem' }}>
                                질문 {qIdx + 1}: {qText}
                              </h6>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {answers.length > 0 ? (
                                  answers.map((ans, i) => (
                                    <div key={i} style={{
                                      padding: '0.5rem 0.75rem',
                                      background: 'var(--bg-color)',
                                      borderRadius: 'var(--radius-sm)',
                                      borderLeft: '3px solid var(--primary-light)'
                                    }}>
                                      <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                                        {ans.evaluatorGroup}모둠의 답변
                                      </span>
                                      <span style={{ color: 'var(--text-main)', fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                        {ans.text}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p style={{ color: '#aaa', fontSize: '0.85rem', paddingLeft: '0.5rem', margin: 0 }}>
                                    아직 답변이 없습니다.
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 전체 대상 질문 답변 모아보기 */}
              {activeEval.allQuestions && activeEval.allQuestions.length > 0 && (
                <div style={{
                  marginTop: '2rem',
                  padding: '1.5rem',
                  background: 'var(--white)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <h3 style={{ color: 'var(--primary-dark)', marginBottom: '1.2rem', fontSize: '1.2rem', borderBottom: '2px solid var(--secondary-color)', paddingBottom: '0.5rem' }}>
                    전체 대상 질문 답변 모아보기
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {activeEval.allQuestions.map((qText, qIdx) => {
                      const answers = submissions
                        .filter(sub => sub.allFeedbacks && sub.allFeedbacks[qIdx])
                        .map(sub => ({
                          evaluatorGroup: sub.evaluatorGroup,
                          text: sub.allFeedbacks[qIdx]
                        }));

                      return (
                        <div key={qIdx} style={{
                          background: 'var(--bg-color)',
                          padding: '1.2rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid #e0e0e0'
                        }}>
                          <h5 style={{ fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.8rem', fontSize: '0.95rem' }}>
                            질문: {qText}
                          </h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {answers.length > 0 ? (
                              answers.map((ans, i) => (
                                <div key={i} style={{
                                  padding: '0.6rem 0.8rem',
                                  background: 'var(--white)',
                                  borderRadius: 'var(--radius-sm)',
                                  borderLeft: '3px solid var(--primary-color)',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                                    {ans.evaluatorGroup}모둠의 답변
                                  </span>
                                  <span style={{ color: 'var(--text-main)', fontSize: '0.88rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                    {ans.text}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p style={{ color: '#aaa', fontSize: '0.85rem', paddingLeft: '0.5rem' }}>
                                아직 답변이 없습니다.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="button-group" style={{ marginTop: '3rem' }}>
              <button className="btn-outline" onClick={goHome}>홈으로 나가기</button>
              <button className="btn-secondary" onClick={handleCloseEval}>평가 마감하기</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
