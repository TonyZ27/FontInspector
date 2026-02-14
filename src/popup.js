// ... 上面的代码保持不变 (loadClips, renderList, deleteClip) ...

  // --- 视图切换逻辑 (更新版: 使用 classList) ---
  
  // 辅助函数：隐藏所有视图
  function hideAllViews() {
    listContainer.classList.add('hidden');
    detailView.classList.add('hidden');
    settingsView.classList.add('hidden');
  }

  function showDetail(clip) {
    currentClip = clip;
    hideAllViews();
    detailView.classList.remove('hidden'); // 移除 hidden 类
    mdTextarea.value = clip.content;
  }

  function showSettings() {
    hideAllViews();
    settingsView.classList.remove('hidden');
    
    // 加载当前设置状态
    chrome.storage.local.get({ autoOpen: true }, (result) => {
      autoOpenToggle.checked = result.autoOpen;
    });
  }

  function showList() {
    hideAllViews();
    listContainer.classList.remove('hidden');
  }

  // --- 设置页逻辑 ---
  settingsBtn.addEventListener('click', showSettings);
  
  autoOpenToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ autoOpen: e.target.checked });
  });

  backBtnSettings.addEventListener('click', showList);
  backBtnDetail.addEventListener('click', showList);

  // --- 详情页功能 ---
  copyBtn.addEventListener('click', () => {
    mdTextarea.select();
    document.execCommand('copy');
    const originalText = copyBtn.innerText;
    copyBtn.innerText = '已复制!';
    // 简单的颜色反馈
    copyBtn.style.backgroundColor = '#4caf50';
    copyBtn.style.color = '#fff';
    
    setTimeout(() => {
      copyBtn.innerText = originalText;
      copyBtn.style.backgroundColor = ''; // 恢复原样
      copyBtn.style.color = '';
    }, 1500);
  });

  // ... 下面的代码保持不变 ...