let currentCardBox = 0;
let currentCopiedBox = 0;
let activeIndex = 0;
let copiedBoxes = document.querySelectorAll('.copied-box');
const cardBoxes = document.querySelectorAll('.card-box');
const buttons = document.querySelectorAll('button');
let copiedImagesMap = {};
let isCopying = false;
let isAnimating = false;

function showBox(boxes, index) {
    boxes.forEach((box, i) => {
        box.classList.toggle('active', i === index);
    });
}

function addGlobalEventListener(type, selector, callback, parent = document) {
    parent.addEventListener(type, e => {
        if (e.target.matches(selector)) {
            callback(e)
        }
    })
}

addGlobalEventListener("click", "button", e => {    
        let x = e.clientX - e.target.offsetLeft;
        let y = e.clientY - e.target.offsetTop;
        
        let waves = document.createElement('span');
        waves.style.left = x + 'px';
        waves.style.top = y + 'px';
        e.target.appendChild(waves);

        setTimeout(() => {
            waves.remove()
        }, 1000);
    }
)

function prevCardBox() {
    if (isAnimating) return;
    isAnimating = true;
    animationComingFromRight();
}

function nextCardBox() {
    if (isAnimating) return;
    isAnimating = true;    
    animationComingFromLeft();
}

function prevCopiedBox() {
    currentCopiedBox = (currentCopiedBox > 0) ? currentCopiedBox - 1 : copiedBoxes.length - 1;
        showBox(copiedBoxes, currentCopiedBox);
    }
    
function nextCopiedBox() {
    currentCopiedBox = (currentCopiedBox < copiedBoxes.length - 1) ? currentCopiedBox + 1 : 0;
    showBox(copiedBoxes, currentCopiedBox);
}

function animationComingFromLeft() {
    const nextIndex = (activeIndex < cardBoxes.length - 1) ? activeIndex + 1 : 0;

    const currentGroup = document.querySelector(`[data-index="${activeIndex}"]`),
    nextGroup = document.querySelector(`[data-index="${nextIndex}"]`);
            
    currentGroup.dataset.status = "after";        
    nextGroup.dataset.status = "becoming-active-from-before";
            
    setTimeout(() => {
        nextGroup.dataset.status = "active";
        activeIndex = nextIndex;
    }); 
            
    if (nextGroup.classList.contains('active')) {
        nextGroup.style.display = "block";
    } else {
        nextGroup.style.display = "block";
        nextGroup.style.position = "absolute";
    }
            
    setTimeout(() => {
        isAnimating = false;                
    }, 700);            
 }     

function animationComingFromRight() {
    const nextIndex = (activeIndex > 0) ? activeIndex - 1 : cardBoxes.length - 1;
    
    const currentGroup = document.querySelector(`[data-index="${activeIndex}"]`),
    nextGroup = document.querySelector(`[data-index="${nextIndex}"]`);
    
            
    currentGroup.dataset.status = "before";    
    nextGroup.dataset.status = "becoming-active-from-after";

    setTimeout(() => {
        nextGroup.dataset.status = "active";
        activeIndex = nextIndex;
    });  
            
    if (nextGroup.classList.contains('active')) {
        nextGroup.style.display = "block";
    } else {
        nextGroup.style.display = "block";
        nextGroup.style.position = "absolute";       
    }

    setTimeout (() => {
        isAnimating = false;
    }, 700);
}       

function takeScreenshot() {
    const copiedBoxes = document.querySelectorAll('.copied-box');
    const promises = [];
    const originalVisibility = [];

    copiedBoxes.forEach((box, index) => {
        originalVisibility[index] = box.style.display;
        box.style.display = 'block'; 
        promises.push(domtoimage.toPng(box));
    });

    Promise.all(promises)
        .then(images => Promise.all(images.map(src => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        })))
        .then(imgElements => {
            const padding = 20; 
            const maxWidth = Math.max(...imgElements.map(img => img.width + padding * 2));
            const totalHeight = imgElements.reduce((sum, img) => sum + img.height + padding * 2, 0);
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = maxWidth;
            combinedCanvas.height = totalHeight;
            const context = combinedCanvas.getContext('2d');

            let yOffset = 0;
            imgElements.forEach(img => {
                const xOffset = (combinedCanvas.width - img.width - padding * 2) / 2;
                context.drawImage(img, xOffset, yOffset + padding);
                yOffset += img.height + padding;
            });

            const imgData = combinedCanvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            link.download = 'combined-screenshot.png';
            link.click();
        })
        .catch(error => console.error('Error capturing images:', error))
        .finally(() => {
            copiedBoxes.forEach((box, index) => {
                box.style.display = originalVisibility[index];
            });
        });
}

addGlobalEventListener("click", ".card-box img", e => {
    toggleImageSelection(e.target);
})

function toggleImageSelection(img) {
    const src = img.src;
    if (img.style.opacity === '0.5' && !isCopying) {
        img.style.opacity = '1.0';
        removeCopiedImage(src, img);
    } else {
        if (!isCopying) {
            img.style.opacity = '0.5';
            copyImage(img);
        }
    }
}

function copyImage(img) {
    isCopying = true;
    const src = img.src;
    const originalBoxShadow = getComputedStyle(img).boxShadow;

    if (!copiedImagesMap[src]) {
        const copiedImg = img.cloneNode();
        copiedImg.style.opacity = '1.0';
        copiedImg.setAttribute('data-box-shadow', originalBoxShadow);
        copiedImg.style.boxShadow = originalBoxShadow;
        copiedImagesMap[src] = {
            element: copiedImg,
            position: null
        };

        let targetContainer = null;

        let existingBoxWithSpace = Array.from(copiedBoxes).find(box => {
            const boxImages = box.querySelectorAll('.copied-images img');
            return boxImages.length < 20;
        });

        if (existingBoxWithSpace) {
        targetContainer = existingBoxWithSpace.querySelector('.copied-images');
        } else {
            targetContainer = createNewCopiedBox();
        }
        animateImage(img, copiedImg, targetContainer);
    } else {
        isCopying = false;
    }
}  

function animateImage(originalImg, copiedImg, targetContainer) {
    showBox(copiedBoxes, copiedBoxes.length - 1);
    const originalRect = originalImg.getBoundingClientRect();
    const containerRect = targetContainer.getBoundingClientRect();
    
    const targetPosition = calculateTargetPosition(targetContainer);
    
    const clone = copiedImg.cloneNode();
    document.body.appendChild(clone);
    clone.classList.add('animated-clone');
    clone.style.left = `${originalRect.left + window.scrollX}px`;
    clone.style.top = `${originalRect.top + window.scrollY}px`;
    
    requestAnimationFrame(() => {
        const translateX = containerRect.left + targetPosition.x - originalRect.left;
        const translateY = containerRect.top + targetPosition.y - originalRect.top;
        clone.style.transform = `translate(${translateX}px, ${translateY}px)`;
    
        copiedImagesMap[copiedImg.src].position = {
            left: containerRect.left + targetPosition.x + window.scrollX,
            top: containerRect.top + targetPosition.y + window.scrollY
        };
    });
    
    clone.addEventListener('transitionend', () => {
        targetContainer.appendChild(copiedImg);
        document.body.removeChild(clone);
        isCopying = false;
    });
}
   
function animateImageBack(copiedImg, originalImg) {
    const originalRect = originalImg.getBoundingClientRect();
    let storedPosition = copiedImg.getBoundingClientRect();
    if (storedPosition.left === 0){
        storedPosition = copiedImagesMap[copiedImg.src].position;
    } 
    const clone = copiedImg.cloneNode();
    document.body.appendChild(clone);
    clone.classList.add('animated-clone-back');
    clone.style.left = `${storedPosition.left}px`;
    clone.style.top = `${storedPosition.top}px`;
    
    requestAnimationFrame(() => {
        const translateX = originalRect.left + window.scrollX - storedPosition.left;
        const translateY = originalRect.top + window.scrollY - storedPosition.top;
        clone.style.transform = `translate(${translateX}px, ${translateY}px)`;
    });
    
    clone.addEventListener('transitionend', () => {
        document.body.removeChild(clone);
    });
}    
  
function calculateTargetPosition(container) {
    const images = container.querySelectorAll('img');
    const row = Math.floor(images.length / 5);
    const col = images.length % 5;
    const offset = 8; 
    return {
        x: col * (111 + offset),
        y: row * (168 + offset)
    };
}

function removeCopiedImage(src, originalImg) {
    if (copiedImagesMap[src]) {
        copiedBoxes = document.querySelectorAll('.copied-box');
        copiedBoxes.forEach((box, index) => {
            const boxImages = box.querySelector('.copied-images');
            const imgToRemove = Array.from(boxImages.querySelectorAll('img')).find(img => img.src === src);

            if (imgToRemove && imgToRemove.parentNode ) {
                animateImageBack(imgToRemove, originalImg);
                imgToRemove.parentNode.removeChild(imgToRemove);
            }
            if (boxImages.children.length < 20 && index < copiedBoxes.length - 1) {
                let nextBoxImages = copiedBoxes[index + 1].querySelector('.copied-images').children;
                while (boxImages.children.length < 20 && nextBoxImages.length > 0) {
                    boxImages.appendChild(nextBoxImages[0]);
                }                   
            }
            if (boxImages.children.length === 0 && box !== copiedBoxes[0]) {
                if (box.parentNode) {
                    box.parentNode.removeChild(box);
                }
                copiedBoxes = document.querySelectorAll('.copied-box');
                showBox(copiedBoxes, copiedBoxes.length - 1);
                copiedBoxes.forEach(() => {
                    titleOfCopiedBox(box);
                });
            }
        });
        delete copiedImagesMap[src];
    }
}  
        
function createNewCopiedBox() {
    currentCopiedBox++;
    const newCopiedBox = document.createElement('div');
    newCopiedBox.classList.add('copied-box');
    titleOfCopiedBox(newCopiedBox);
    document.querySelector('.container').appendChild(newCopiedBox);
    copiedBoxes = document.querySelectorAll('.copied-box');
    showBox(copiedBoxes, currentCopiedBox);
    return newCopiedBox.querySelector('.copied-images');
}

function titleOfCopiedBox(e){
    e.innerHTML = `<h3><span class="color-yellow">All</span> The <span class="color-yellow">Curses</span> You <span class="color-yellow">Selected</span> (${copiedBoxes.length + 1})</h3><div class="copied-images"></div>`;
}