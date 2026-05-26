/**
 * Vendora PDF Toolkit - Privacy-First Analytics Module
 * 
 * Safely reports interaction counts to Google Analytics without transmitting
 * any sensitive metadata like file names, file contents, folder sizes,
 * text contents, passwords, or personal details.
 */
window.PdfAnalytics = {
  /**
   * Safe logs a event to global gtag tracker if present.
   * @param {string} eventName Name of the event (e.g. 'pdf_tool_view')
   * @param {Object} [params] Safe parameters only (e.g. { tool_id: 'merge-pdf' })
   */
  logEvent: function(eventName, params) {
    // Audit check: Ensure absolutely zero leakage of restricted variables
    const safeParams = {};
    if (params) {
      // Whitelist only explicit safe parameters:
      if (params.tool_id) {
        safeParams.tool_id = String(params.tool_id);
      }
      if (params.category) {
        safeParams.category = String(params.category);
      }
      if (params.status_code) {
        safeParams.status_code = String(params.status_code); // e.g. 'success', 'user_cancelled', 'decrypt_failed'
      }
      if (params.file_count !== undefined) {
        safeParams.file_count = Number(params.file_count); // numeric count of files only
      }
      if (params.total_size_bytes !== undefined) {
        // Approximate to nearest MB to avoid unique size identification fingerprinting
        safeParams.total_size_approx_mb = Math.round(Number(params.total_size_bytes) / (1024 * 1024));
      }
    }

    // Console debugging in dev environment
    console.debug(`[PdfAnalytics] Event: ${eventName}`, safeParams);

    if (typeof window.vendoraAnalyticsContext === 'function') {
      Object.assign(safeParams, window.vendoraAnalyticsContext({}));
    }

    // Call GA tracker
    if (typeof window.gtag === 'function') {
      try {
        window.gtag('event', eventName, safeParams);
        if (eventName !== 'pdf_tool_use') {
          window.gtag('event', 'pdf_tool_use', Object.assign({}, safeParams, {
            pdf_action: eventName
          }));
        }
      } catch (err) {
        console.error('[PdfAnalytics] Failed to send to gtag:', err);
      }
    }
  },

  /**
   * Tracks when the main hub page or a specific tool sub-interface is viewed
   */
  trackView: function(toolId = 'hub') {
    this.logEvent('pdf_tool_view', {
      tool_id: toolId
    });
  },

  /**
   * Tracks when a user clicks on a specific tool card in the catalog grid
   */
  trackSelect: function(toolId, category) {
    this.logEvent('pdf_tool_select', {
      tool_id: toolId,
      category: category
    });
  },

  /**
   * Tracks when files are dropped or uploaded to an active tool zone
   */
  trackUploadStarted: function(toolId, fileCount, totalSize) {
    this.logEvent('pdf_tool_upload_started', {
      tool_id: toolId,
      file_count: fileCount,
      total_size_bytes: totalSize
    });
  },

  /**
   * Tracks when a PDF tool operation completes successfully
   */
  trackSuccess: function(toolId, fileCount, totalSize) {
    this.logEvent('pdf_tool_conversion_success', {
      tool_id: toolId,
      file_count: fileCount,
      total_size_bytes: totalSize,
      status_code: 'success'
    });
  },

  /**
   * Tracks when a PDF tool operation fails with an error
   */
  trackError: function(toolId, errorCode, fileCount) {
    this.logEvent('pdf_tool_conversion_error', {
      tool_id: toolId,
      status_code: errorCode || 'unknown_error',
      file_count: fileCount || 1
    });
  }
};
