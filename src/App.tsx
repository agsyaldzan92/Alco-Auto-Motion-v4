import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InputTab } from './components/InputTab';
import { AiAnalysisTab } from './components/AiAnalysisTab';
import { EditPlanTab } from './components/EditPlanTab';
import { ExportModal } from './components/ExportModal';
import { AiProcessingModal } from './components/AiProcessingModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { AiProposalModal } from './components/AiProposalModal';
import { ContentType, AlcoEditingProject, SampleVideoOption, UserProofAsset } from './types';
import { SAMPLE_VIDEOS } from './data/sampleVideos';
import { useAiWorkflow } from './hooks/useAiWorkflow';
import { useTheme } from './hooks/useTheme';

export default function App() {
  useTheme();
  const [activeTab, setActiveTab] = useState<'input' | 'analysis' | 'edit_preview'>('input');
  const [contentType, setContentType] = useState<ContentType>('education');
  const [rawScript, setRawScript] = useState<string>(SAMPLE_VIDEOS[0].rawTranscript);
  const [videoGoal, setVideoGoal] = useState<string>(SAMPLE_VIDEOS[0].goal);
  const [ctaText, setCtaText] = useState<string>(SAMPLE_VIDEOS[0].cta);
  const [selectedSampleId, setSelectedSampleId] = useState<string>(SAMPLE_VIDEOS[0].id);
  const [videoUrl, setVideoUrl] = useState<string>(SAMPLE_VIDEOS[0].videoUrl);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(SAMPLE_VIDEOS[0].duration);
  const [videoMeta, setVideoMeta] = useState<{ width: number; height: number; aspect: string } | null>({
    width: 720,
    height: 1280,
    aspect: '9:16 Vertical (Optimized)',
  });
  const [userAssets, setUserAssets] = useState<UserProofAsset[]>([]);

  const handleAddUserAsset = (asset: Omit<UserProofAsset, 'id'>) => {
    const newAsset: UserProofAsset = {
      ...asset,
      id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    setUserAssets((prev) => [...prev, newAsset]);
  };

  const handleRemoveUserAsset = (id: string) => {
    setUserAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const [project, setProject] = useState<AlcoEditingProject | null>(null);
  const [proposalProject, setProposalProject] = useState<AlcoEditingProject | null>(null);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);

  // Helper to handle custom file upload with safe object URL lifecycle & session storage
  const handleUploadCustomFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Format file tidak didukung. Mohon upload video format MP4/MOV/WebM.');
      return;
    }

    // Revoke previous object URL if one was created to prevent memory leaks
    if (uploadedUrl && uploadedUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(uploadedUrl);
      } catch (_) {}
    }

    const newObjUrl = URL.createObjectURL(file);
    setUploadedFile(file);
    setUploadedUrl(newObjUrl);
    setVideoFile(file);
    setVideoUrl(newObjUrl);
    setSelectedSampleId('custom');

    try {
      sessionStorage.setItem('alco_custom_video_name', file.name);
      sessionStorage.setItem('alco_custom_video_size', String(file.size));
    } catch (_) {}

    // Extract metadata from file
    const tempVideo = document.createElement('video');
    tempVideo.src = newObjUrl;
    tempVideo.preload = 'metadata';
    tempVideo.onloadedmetadata = () => {
      const dur = Math.round(tempVideo.duration * 10) / 10 || 25;
      setVideoDuration(dur);
      const w = tempVideo.videoWidth || 720;
      const h = tempVideo.videoHeight || 1280;
      const aspect = w < h ? '9:16 Vertical (Optimized)' : w === h ? '1:1 Square' : '16:9 Landscape';
      setVideoMeta({ width: w, height: h, aspect });
    };
  };

  // Helper to restore previously uploaded custom video
  const handleRestoreUploadedFile = () => {
    if (uploadedFile && uploadedUrl) {
      setVideoFile(uploadedFile);
      setVideoUrl(uploadedUrl);
      setSelectedSampleId('custom');
    }
  };

  // Helper to clear uploaded file and return to default sample
  const handleClearCustomUpload = () => {
    if (uploadedUrl && uploadedUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(uploadedUrl);
      } catch (_) {}
    }
    setUploadedFile(null);
    setUploadedUrl(null);
    handleSelectSample(SAMPLE_VIDEOS[0]);
  };

  // Helper to select sample preset
  const handleSelectSample = (sample: SampleVideoOption) => {
    setSelectedSampleId(sample.id);
    setVideoUrl(sample.videoUrl);
    setVideoFile(null);
    setVideoDuration(sample.duration);
    setContentType(sample.contentType);
    setRawScript(sample.rawTranscript);
    setVideoGoal(sample.goal);
    setCtaText(sample.cta);
    setVideoMeta({ width: 720, height: 1280, aspect: '9:16 Vertical (Optimized)' });
  };

  // Hook for AI Workflow & Real-Time Loading Management
  const {
    processingState,
    runAnalysis,
    retryLast,
    dismissError,
  } = useAiWorkflow({
    rawScript,
    videoDuration,
    contentType,
    videoGoal,
    ctaText,
    videoUrl,
    videoFile,
    userProofAssets: userAssets,
    onScriptExtracted: setRawScript,
    onSuccess: (newProject) => {
      // Ensure custom upload source is preserved if in custom mode
      if (selectedSampleId === 'custom' && uploadedUrl) {
        newProject.raw_video_url = uploadedUrl;
      }
      setProject(newProject);
      setProposalProject(newProject);
      // Open proposal summary review modal to give creator full transparency
      setIsProposalModalOpen(true);
    },
  });

  const handleApplyAiProposal = (acceptedProject: AlcoEditingProject) => {
    setProject(acceptedProject);
    setIsProposalModalOpen(false);
    setActiveTab('edit_preview');
  };

  // Batch 1: Helper to get active video source consistently across preview and export
  const getActiveVideoSource = (): string => {
    if (selectedSampleId === 'custom' && uploadedUrl) {
      return uploadedUrl;
    }
    return project?.raw_video_url || videoUrl;
  };

  const activeVideoUrl = getActiveVideoSource();
  const activeVideoFile = videoFile || uploadedFile;

  // User starts on Upload page and chooses to Upload Video or Try Demo (no auto-run)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        hasPlan={!!project}
        isProcessing={processingState.isProcessing}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
      />

      {/* Real-time Multi-Step AI Processing Modal */}
      {processingState.isProcessing && (
        <AiProcessingModal
          state={processingState}
          onRetry={retryLast}
          onClose={dismissError}
        />
      )}

      {/* Gemini BYO API Key Configuration Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />

      {/* AI Proposal Summary Modal (Transparency before Workspace) */}
      <AiProposalModal
        isOpen={isProposalModalOpen}
        project={proposalProject || project}
        onClose={() => {
          setIsProposalModalOpen(false);
          setActiveTab('edit_preview');
        }}
        onApplyDecisions={handleApplyAiProposal}
      />

      {/* Main Tab Content */}
      <main className="flex-1 pb-16">
        {activeTab === 'input' && (
          <InputTab
            contentType={contentType}
            setContentType={setContentType}
            rawScript={rawScript}
            setRawScript={setRawScript}
            videoGoal={videoGoal}
            setVideoGoal={setVideoGoal}
            ctaText={ctaText}
            setCtaText={setCtaText}
            videoUrl={activeVideoUrl}
            videoFile={activeVideoFile}
            uploadedFile={uploadedFile}
            uploadedUrl={uploadedUrl}
            selectedSampleId={selectedSampleId}
            onSelectSample={handleSelectSample}
            onUploadCustomFile={handleUploadCustomFile}
            onRestoreUploadedFile={handleRestoreUploadedFile}
            videoDuration={videoDuration}
            setVideoDuration={setVideoDuration}
            videoMeta={videoMeta}
            setVideoMeta={setVideoMeta}
            userAssets={userAssets}
            onAddUserAsset={handleAddUserAsset}
            onRemoveUserAsset={handleRemoveUserAsset}
            onStartAnalysis={(sample) => runAnalysis(sample)}
            processingState={processingState}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        )}

        {activeTab === 'analysis' && (
          <AiAnalysisTab
            project={project}
            onProceedToPreview={() => setActiveTab('edit_preview')}
          />
        )}

        {activeTab === 'edit_preview' && project && (
          <EditPlanTab
            project={project}
            videoUrl={activeVideoUrl}
            onUpdateProject={setProject}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onRegenerateAll={() => runAnalysis()}
            onOpenProposalModal={() => {
              setProposalProject(project);
              setIsProposalModalOpen(true);
            }}
            isProcessing={processingState.isProcessing}
          />
        )}
      </main>

      {/* Export Modal */}
      {project && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          project={project}
          videoUrl={activeVideoUrl}
          videoFile={activeVideoFile}
          onUpdateProject={setProject}
        />
      )}
    </div>
  );
}
