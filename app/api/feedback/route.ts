/**
 * Feedback API Route - Creates GitHub issues from user feedback
 *
 * This endpoint accepts user feedback (bug reports, feature requests, general)
 * and creates corresponding GitHub issues with appropriate labels.
 *
 * Prerequisites:
 * - GITHUB_PAT: Personal access token with 'repo' scope
 * - GITHUB_REPO: Target repository (e.g., 'owner/repo')
 * - Labels must exist in target repo: 'user-feedback', 'bug', 'enhancement', 'question'
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';

// Validation constants
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 5000;

const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  bug: 'bug',
  feature: 'enhancement',
  general: 'question',
};

const FEEDBACK_TYPE_TITLES: Record<string, string> = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  general: 'General Feedback',
};

interface FeedbackRequest {
  type: 'bug' | 'feature' | 'general';
  description: string;
  pageUrl?: string;
}

export async function POST(request: Request) {
  const { user } = await withAuth();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const githubPat = process.env.GITHUB_PAT;
  const githubRepo = process.env.GITHUB_REPO;

  if (!githubPat || !githubRepo) {
    console.error('GitHub feedback integration not configured');
    return NextResponse.json(
      { error: 'Feedback integration not configured' },
      { status: 500 }
    );
  }

  try {
    const body: FeedbackRequest = await request.json();
    const { type, description, pageUrl } = body;

    // Validate required fields
    if (!type || !['bug', 'feature', 'general'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      );
    }

    if (!description || description.trim().length < MIN_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Sanitize description to prevent markdown/HTML injection
    const sanitizedDescription = description.trim();

    // Build issue title from first line/sentence of description
    const summaryMatch = sanitizedDescription.match(/^(.{1,60})(?:\s|$|\.|!|\?)/);
    const summary = summaryMatch
      ? summaryMatch[1].trim()
      : sanitizedDescription.slice(0, 60).trim();
    const title = `[${FEEDBACK_TYPE_TITLES[type]}] ${summary}`;

    // Build issue body
    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown';
    const timestamp = new Date().toISOString();

    let issueBody = `## Feedback Details\n\n`;
    issueBody += `**Submitted by:** ${userName} (${user.email})\n`;
    issueBody += `**Timestamp:** ${timestamp}\n`;
    if (pageUrl) {
      issueBody += `**Page URL:** ${pageUrl}\n`;
    }
    issueBody += `\n## Description\n\n${sanitizedDescription}`;

    // Create GitHub issue
    const response = await fetch(
      `https://api.github.com/repos/${githubRepo}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubPat}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body: issueBody,
          labels: ['user-feedback', FEEDBACK_TYPE_LABELS[type]],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('GitHub API error:', response.status, errorData);

      // Provide more helpful error messages for common failures
      let errorMessage = 'Failed to create feedback issue';
      if (response.status === 401) {
        errorMessage = 'GitHub authentication failed - please contact support';
      } else if (response.status === 404) {
        errorMessage = 'GitHub repository not found - please contact support';
      } else if (response.status === 422) {
        errorMessage = 'Invalid issue data - please try again';
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    const issue = await response.json();

    return NextResponse.json({
      success: true,
      issueNumber: issue.number,
      issueUrl: issue.html_url,
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
