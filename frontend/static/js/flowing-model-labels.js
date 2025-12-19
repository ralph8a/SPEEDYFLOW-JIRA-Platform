/* Flowing - Labels loader
   Fetches available label encoders/options from backend and exposes
   a simple client: window.FlowingLabels.getOptions(field)
*/
(function(){
  const FlowingLabels = {
    data: {},
    async load(){
      try{
        const res = await fetch('/api/models/options');
        if(!res.ok) return null;
        const j = await res.json();
        this.data = j.options || {};
        return this.data;
      }catch(e){ console.warn('FlowingLabels.load error', e); return null; }
    },
    getOptions(field){
      return this.data[field] || [];
    }
  };

  window.FlowingLabels = window.FlowingLabels || FlowingLabels;

  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(()=> window.FlowingLabels.load(), 0);
  } else {
    document.addEventListener('DOMContentLoaded', ()=> window.FlowingLabels.load());
  }
})();
