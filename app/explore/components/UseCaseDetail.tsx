'use client';

import { useEffect } from 'react';
import {
  AlertCircle,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Bot,
} from 'lucide-react';
import type { ExploreUseCase, ExplorePhase } from '@/explore/data/types';

interface UseCaseDetailProps {
  useCase: ExploreUseCase;
  phase: ExplorePhase;
}

export default function UseCaseDetail({ useCase, phase }: UseCaseDetailProps) {
  useEffect(() => {
    const sections = document.querySelectorAll('[data-section]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');

            // Stagger-reveal capability children when the capabilities container enters
            const capabilities = entry.target.querySelectorAll(
              '.explore-detail-capability'
            );
            if (capabilities.length > 0) {
              capabilities.forEach((child, i) => {
                setTimeout(() => {
                  child.classList.add('visible');
                }, i * 80);
              });
            }

            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    sections.forEach((s) => observer.observe(s));

    return () => observer.disconnect();
  }, [useCase.id]);

  return (
    <div className="explore-detail">
      {/* Hero */}
      <div className="explore-detail-hero">
        <span
          className="explore-detail-phase-chip"
          style={{ '--phase-color': `var(${phase.colorVar})` } as React.CSSProperties}
        >
          {phase.name}
        </span>
        <span className="explore-usecase-number">{useCase.id}</span>
        <h1>{useCase.title}</h1>
      </div>

      {/* Challenge */}
      <div className="explore-detail-section explore-detail-challenge" data-section>
        <div className="explore-section-label">
          <AlertCircle size={16} /> THE CHALLENGE
        </div>
        <p>{useCase.challenge}</p>
      </div>

      {/* Impact */}
      <div className="explore-detail-section explore-detail-impact" data-section>
        <div className="explore-section-label">
          <TrendingUp size={16} /> THE IMPACT
        </div>
        <p className="explore-detail-impact-text">{useCase.impact}</p>
      </div>

      {/* Solution */}
      <div className="explore-detail-section explore-detail-solution" data-section>
        <div className="explore-section-label">
          <Sparkles size={16} /> THE SOLUTION
        </div>
        <h2 className="explore-detail-solution-name">{useCase.solutionName}</h2>
        <p>{useCase.solutionDescription}</p>
      </div>

      {/* Capabilities */}
      <div className="explore-detail-section" data-section>
        <div className="explore-section-label">
          <CheckCircle2 size={16} /> CAPABILITIES
        </div>
        <div className="explore-detail-capabilities">
          {useCase.capabilities.map((cap, i) => (
            <div
              key={i}
              className="explore-detail-capability"
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <CheckCircle2 className="explore-detail-capability-icon" size={18} />
              <span>{cap}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agents */}
      <div className="explore-detail-section" data-section>
        <div className="explore-section-label">
          <Bot size={16} /> POWERED BY
        </div>
        <div className="explore-detail-agents-grid">
          {useCase.agents.map((agent, i) => (
            <div key={i} className="explore-detail-agent-card">
              <div className="explore-detail-agent-icon">
                <Bot size={20} />
              </div>
              <div>
                <div className="explore-detail-agent-name">{agent.name}</div>
                <p className="explore-detail-agent-description">
                  {agent.description}
                </p>
                <div className="explore-detail-agent-tools">
                  {agent.tools.map((tool) => (
                    <span key={tool} className="explore-detail-agent-tool">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
