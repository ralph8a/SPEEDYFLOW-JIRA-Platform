(function($) {
    'use strict';

    // Define the MVP Footer class
    class MvpFooter {
        constructor(element) {
            this.$element = $(element);
            this.init();
        }

        // Initialize the MVP Footer
        init() {
            this.cacheDomElements();
            this.bindEvents();
            this.render();
        }

        // Cache DOM elements for performance
        cacheDomElements() {
            this.$footer = this.$element.find('footer');
            this.$backToTopBtn = this.$element.find('.back-to-top');
        }

        // Bind event handlers
        bindEvents() {
            this.$backToTopBtn.on('click', this.scrollToTop.bind(this));
            $(window).on('scroll', this.toggleBackToTopBtn.bind(this));
        }

        // Render the initial state of the footer
        render() {
            this.toggleBackToTopBtn();
        }

        // Scroll to top functionality
        scrollToTop(event) {
            event.preventDefault();
            $('html, body').animate({ scrollTop: 0 }, 800);
        }

        // Toggle the visibility of the back-to-top button
        toggleBackToTopBtn() {
            if ($(window).scrollTop() > 100) {
                this.$backToTopBtn.fadeIn();
            } else {
                this.$backToTopBtn.fadeOut();
            }
        }
    }

    // Register the MVP Footer as a jQuery plugin
    $.fn.mvpFooter = function() {
        return this.each(function() {
            new MvpFooter(this);
        });
    };

    // Auto-initialize the MVP Footer on elements with class "mvp-footer"
    $(document).ready(function() {
        $('.mvp-footer').mvpFooter();
    });
})(jQuery);
