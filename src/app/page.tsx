/**
 * Main Next.js Page Component
 * 
 * This is the application entry point that renders the SpintaxEditor component.
 * Next.js uses this file as the main route ('/').
 */

"use client"

import { SpintaxEditor } from '@/components/spintax-editor';

/**
 * SpintaxEditorPage Component
 * 
 * Renders the main SpintaxEditor within the Next.js app.
 * Uses the 'use client' directive for client-side rendering.
 */
export default function SpintaxEditorPage() {
  return <SpintaxEditor />;
}
